package main

import (
	"embed"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

//go:embed index.html quad_shot/* sprites/*
var embeddedAssets embed.FS

// Self-healing asset verification and extraction
func selfHealAssets() {
	criticalFiles := []string{
		"quad_shot/index.html",
		"quad_shot/index.css",
		"quad_shot/bundle.js",
	}

	for _, file := range criticalFiles {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			data, readErr := embeddedAssets.ReadFile(file)
			if readErr == nil {
				_ = os.MkdirAll(filepath.Dir(file), 0755)
				_ = os.WriteFile(file, data, 0644)
				fmt.Printf("[Self-Heal] Restored missing file: %s\n", file)
			}
		}
	}
}

// Find available chromeless application window launcher
func launchAppWindow(targetURL string) (*exec.Cmd, error) {
	width := "1280"
	height := "820"

	switch runtime.GOOS {
	case "windows":
		// Windows Edge, Chrome, Brave app mode search paths
		candidates := []string{
			os.ExpandEnv("${ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe"),
			os.ExpandEnv("${ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe"),
			os.ExpandEnv("${LocalAppData}\\Microsoft\\Edge\\Application\\msedge.exe"),
			os.ExpandEnv("${ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe"),
			os.ExpandEnv("${ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe"),
			os.ExpandEnv("${LocalAppData}\\Google\\Chrome\\Application\\chrome.exe"),
			"msedge.exe",
			"chrome.exe",
		}
		for _, exe := range candidates {
			if _, err := exec.LookPath(exe); err == nil || fileExists(exe) {
				args := []string{fmt.Sprintf("--app=%s", targetURL), fmt.Sprintf("--window-size=%s,%s", width, height)}
				cmd := exec.Command(exe, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}
		// Fallback to start
		cmd := exec.Command("cmd", "/c", "start", targetURL)
		return cmd, cmd.Start()

	case "darwin": // macOS
		candidates := []struct {
			app string
			bin string
		}{
			{"Google Chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"},
			{"Microsoft Edge", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"},
			{"Brave Browser", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"},
		}
		for _, c := range candidates {
			if fileExists(c.bin) {
				args := []string{"-na", c.app, "--args", fmt.Sprintf("--app=%s", targetURL), fmt.Sprintf("--window-size=%s,%s", width, height)}
				cmd := exec.Command("open", args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}
		// Fallback to open
		cmd := exec.Command("open", targetURL)
		return cmd, cmd.Start()

	case "linux":
	default:
		candidates := []string{
			"google-chrome",
			"google-chrome-stable",
			"chromium",
			"chromium-browser",
			"brave-browser",
			"microsoft-edge",
			"microsoft-edge-stable",
		}
		for _, exe := range candidates {
			if path, err := exec.LookPath(exe); err == nil {
				args := []string{
					fmt.Sprintf("--app=%s", targetURL),
					fmt.Sprintf("--window-size=%s,%s", width, height),
					"--no-first-run",
					"--disable-default-apps",
				}
				cmd := exec.Command(path, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}
		// Fallback to xdg-open
		if path, err := exec.LookPath("xdg-open"); err == nil {
			cmd := exec.Command(path, targetURL)
			return cmd, cmd.Start()
		}
	}

	return nil, fmt.Errorf("no suitable application window launcher found")
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func main() {
	serverOnly := flag.Bool("server-only", false, "Run local HTTP server without launching window")
	portFlag := flag.Int("port", 0, "Specify port (default: 0 for dynamic auto-selection)")
	flag.Parse()

	fmt.Println("==================================================")
	fmt.Println("             QUAD SHOT DESKTOP RUNNER             ")
	fmt.Println("     High-Speed 2D Open-World Cartesian Plane     ")
	fmt.Println("==================================================")

	// Step 1: Self-heal local files if needed
	selfHealAssets()

	// Step 2: Establish self-healing listener with ephemeral/auto port
	var listener net.Listener
	var err error

	if *portFlag > 0 {
		listener, err = net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *portFlag))
		if err != nil {
			fmt.Printf("[Self-Heal] Port %d unavailable, dynamically assigning free port...\n", *portFlag)
			listener, err = net.Listen("tcp", "127.0.0.1:0")
		}
	} else {
		listener, err = net.Listen("tcp", "127.0.0.1:0")
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Fatal error binding listener: %v\n", err)
		os.Exit(1)
	}

	assignedPort := listener.Addr().(*net.TCPAddr).Port
	gameURL := fmt.Sprintf("http://127.0.0.1:%d/quad_shot/index.html", assignedPort)

	// Step 3: Setup HTTP Server with embedded filesystem fallback
	mux := http.NewServeMux()

	// Health check endpoint for watchdog self-healing
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy","game":"Quad Shot"}`))
	})

	// Root redirect
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || path == "/index.html" {
			http.Redirect(w, r, "/quad_shot/index.html", http.StatusTemporaryRedirect)
			return
		}

		// Clean path
		cleanPath := strings.TrimPrefix(path, "/")

		// Prefer physical file if present
		if fileExists(cleanPath) {
			http.ServeFile(w, r, cleanPath)
			return
		}

		// Also check quad_shot/sprites rewrite to sprites/
		if strings.HasPrefix(cleanPath, "quad_shot/sprites/") {
			altPath := strings.Replace(cleanPath, "quad_shot/sprites/", "sprites/", 1)
			if fileExists(altPath) {
				http.ServeFile(w, r, altPath)
				return
			}
			// Check embedded
			if data, err := embeddedAssets.ReadFile(altPath); err == nil {
				serveEmbeddedBytes(w, altPath, data)
				return
			}
		}

		// Embedded fallback
		data, err := embeddedAssets.ReadFile(cleanPath)
		if err == nil {
			serveEmbeddedBytes(w, cleanPath, data)
			return
		}

		// Try embedded in sub-dir
		subData, subErr := fs.ReadFile(embeddedAssets, cleanPath)
		if subErr == nil {
			serveEmbeddedBytes(w, cleanPath, subData)
			return
		}

		http.NotFound(w, r)
	})

	server := &http.Server{Handler: mux}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Server warning: %v\n", err)
		}
	}()

	fmt.Printf("[Ready] Engine initialized on: %s\n", gameURL)

	// Step 4: Launch dedicated window if not server-only
	if !*serverOnly {
		fmt.Println("[Window] Launching Quad Shot in dedicated application window...")
		cmd, winErr := launchAppWindow(gameURL)
		if winErr != nil {
			fmt.Printf("[Notice] Could not launch chromeless window: %v\n", winErr)
			fmt.Printf("[Notice] You can connect manually at: %s\n", gameURL)
		} else {
			fmt.Println("[Active] Quad Shot running. Press Ctrl+C in terminal to terminate.")
			go func() {
				_ = cmd.Wait()
			}()
		}
	} else {
		fmt.Printf("[Server-Only] Quad Shot server active at: %s\n", gameURL)
	}

	// Step 5: Graceful termination and self-healing watchdog
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Watchdog loop
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-sigChan:
			fmt.Println("\n[Shutdown] Terminating Quad Shot server cleanly...")
			_ = server.Close()
			return
		case <-ticker.C:
			// Perform background healthcheck
			resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/healthz", assignedPort))
			if err != nil || resp.StatusCode != http.StatusOK {
				fmt.Println("[Self-Heal] Healthcheck warning: re-verifying server state...")
			}
			if resp != nil {
				_ = resp.Body.Close()
			}
		}
	}
}

func serveEmbeddedBytes(w http.ResponseWriter, path string, data []byte) {
	switch {
	case strings.HasSuffix(path, ".html"):
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	case strings.HasSuffix(path, ".css"):
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	case strings.HasSuffix(path, ".js"):
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	case strings.HasSuffix(path, ".json"):
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
	case strings.HasSuffix(path, ".png"):
		w.Header().Set("Content-Type", "image/png")
	case strings.HasSuffix(path, ".wav"):
		w.Header().Set("Content-Type", "audio/wav")
	case strings.HasSuffix(path, ".mp3"):
		w.Header().Set("Content-Type", "audio/mpeg")
	}
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, string(data))
}
