package main

import (
	"bytes"
	"embed"
	"flag"
	"fmt"
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
// When run as a standalone downloaded executable, automatically installs/repairs all game assets
func selfHealAssets() {
	// If assets already exist in working directory or parent directory, skip extraction
	if fileExists("quad_shot/index.html") || fileExists("../quad_shot/index.html") {
		return
	}

	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		if realPath, evalErr := filepath.EvalSymlinks(exePath); evalErr == nil {
			baseDir = filepath.Dir(realPath)
		} else {
			baseDir = filepath.Dir(exePath)
		}
	}

	var unpackedCount int
	_ = fs.WalkDir(embeddedAssets, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil || path == "." {
			return nil
		}

		targetPath := filepath.Join(baseDir, filepath.FromSlash(path))

		if d.IsDir() {
			_ = os.MkdirAll(targetPath, 0755)
			return nil
		}

		// Check if file exists on disk
		if _, statErr := os.Stat(targetPath); os.IsNotExist(statErr) {
			data, readErr := embeddedAssets.ReadFile(path)
			if readErr == nil {
				_ = os.MkdirAll(filepath.Dir(targetPath), 0755)
				if writeErr := os.WriteFile(targetPath, data, 0644); writeErr == nil {
					unpackedCount++
				}
			}
		}
		return nil
	})

	if unpackedCount > 0 {
		fmt.Printf("[Self-Heal / Installer] Successfully verified and installed %d game assets.\n", unpackedCount)
	}
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// Serve file either from physical disk (if present) or fallback to embedded assets
func serveFileOrEmbedded(w http.ResponseWriter, r *http.Request, path string) {
	candidates := []string{path}
	if strings.HasPrefix(path, "sprites/release/") {
		candidates = append(candidates, strings.Replace(path, "sprites/release/", "sprites/character-sprites/release/", 1))
	} else if strings.HasPrefix(path, "sprites/character-sprites/release/") {
		candidates = append(candidates, strings.Replace(path, "sprites/character-sprites/release/", "sprites/release/", 1))
	}

	// 1. Try physical disk
	for _, p := range candidates {
		if fileExists(p) {
			f, err := os.Open(p)
			if err == nil {
				defer f.Close()
				stat, err := f.Stat()
				if err == nil && !stat.IsDir() {
					http.ServeContent(w, r, filepath.Base(p), stat.ModTime(), f)
					return
				}
			}
		}
	}

	// 2. Fallback to embedded assets
	for _, p := range candidates {
		cleanEmbeddedPath := filepath.ToSlash(p)
		data, err := embeddedAssets.ReadFile(cleanEmbeddedPath)
		if err == nil {
			http.ServeContent(w, r, filepath.Base(cleanEmbeddedPath), time.Time{}, bytes.NewReader(data))
			return
		}
	}

	http.NotFound(w, r)
}

// Find available chromeless application window launcher
func launchAppWindow(targetURL string) (*exec.Cmd, error) {
	width := "1280"
	height := "820"
	tempProfile := filepath.Join(os.TempDir(), "quad_shot_webprofile")

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
			os.ExpandEnv("${ProgramFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
			os.ExpandEnv("${LocalAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
		}
		for _, exe := range candidates {
			if fileExists(exe) {
				args := []string{
					fmt.Sprintf("--app=%s", targetURL),
					fmt.Sprintf("--window-size=%s,%s", width, height),
					fmt.Sprintf("--user-data-dir=%s", tempProfile),
					"--no-first-run",
					"--no-default-browser-check",
				}
				cmd := exec.Command(exe, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// Check LookPath for msedge or chrome
		for _, name := range []string{"msedge.exe", "chrome.exe", "brave.exe"} {
			if path, err := exec.LookPath(name); err == nil {
				args := []string{
					fmt.Sprintf("--app=%s", targetURL),
					fmt.Sprintf("--window-size=%s,%s", width, height),
					fmt.Sprintf("--user-data-dir=%s", tempProfile),
					"--no-first-run",
				}
				cmd := exec.Command(path, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// Firefox fallback
		for _, ff := range []string{
			os.ExpandEnv("${ProgramFiles}\\Mozilla Firefox\\firefox.exe"),
			os.ExpandEnv("${ProgramFiles(x86)}\\Mozilla Firefox\\firefox.exe"),
		} {
			if fileExists(ff) {
				cmd := exec.Command(ff, "--new-window", targetURL)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// System shell fallback
		cmd := exec.Command("cmd", "/c", "start", "", targetURL)
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
				args := []string{
					fmt.Sprintf("--app=%s", targetURL),
					fmt.Sprintf("--window-size=%s,%s", width, height),
					fmt.Sprintf("--user-data-dir=%s", tempProfile),
					"--no-first-run",
				}
				cmd := exec.Command(c.bin, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// Firefox fallback on macOS
		if fileExists("/Applications/Firefox.app/Contents/MacOS/firefox") {
			cmd := exec.Command("/Applications/Firefox.app/Contents/MacOS/firefox", "-new-window", targetURL)
			if err := cmd.Start(); err == nil {
				return cmd, nil
			}
		}

		// Fallback to open
		cmd := exec.Command("open", targetURL)
		return cmd, cmd.Start()

	default: // Linux and other POSIX
		// Priority 1: Chromium-based standalone app window
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
					fmt.Sprintf("--user-data-dir=%s", tempProfile),
					"--no-first-run",
					"--disable-default-apps",
				}
				cmd := exec.Command(path, args...)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// Priority 2: Firefox dedicated window
		for _, ff := range []string{"firefox", "firefox-esr"} {
			if path, err := exec.LookPath(ff); err == nil {
				cmd := exec.Command(path, "--new-window", targetURL)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}

		// Priority 3: System launchers
		for _, launcher := range []string{"xdg-open", "sensible-browser", "x-www-browser"} {
			if path, err := exec.LookPath(launcher); err == nil {
				cmd := exec.Command(path, targetURL)
				if err := cmd.Start(); err == nil {
					return cmd, nil
				}
			}
		}
	}

	return nil, fmt.Errorf("no suitable browser or application window launcher found on system")
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

	// Step 2: Establish self-healing listener with dynamic auto-port
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

	// Unified routing for root, quad_shot, and assets
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		reqPath := strings.TrimPrefix(r.URL.Path, "/")
		if reqPath == "" || reqPath == "index.html" || reqPath == "quad_shot" || reqPath == "quad_shot/" || reqPath == "quad_shot/index.html" {
			serveFileOrEmbedded(w, r, "quad_shot/index.html")
			return
		}

		// Rewrite quad_shot/sprites to sprites/
		if strings.HasPrefix(reqPath, "quad_shot/sprites/") {
			reqPath = strings.Replace(reqPath, "quad_shot/sprites/", "sprites/", 1)
		}

		serveFileOrEmbedded(w, r, reqPath)
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
			fmt.Printf("[Notice] Could not launch window: %v\n", winErr)
			fmt.Printf("[Notice] You can connect manually in your browser at: %s\n", gameURL)
		} else {
			fmt.Println("[Active] Quad Shot running. Close the game window or press Ctrl+C to exit.")
			startTime := time.Now()
			go func() {
				_ = cmd.Wait()
				// If process ran for more than 2 seconds and closed, window was closed by user
				if time.Since(startTime) > 2*time.Second {
					fmt.Println("\n[Shutdown] Game window closed by user. Terminating server cleanly...")
					_ = server.Close()
					os.Exit(0)
				}
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
