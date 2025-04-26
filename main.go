package main

import (
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

var (
	jsonFile string
	kanban   KanbanData
)

func editFile(c *gin.Context) {
	file := c.Param("file")
	text, err := c.GetRawData()
	if err != nil {
		c.Status(500)
		fmt.Println("[Edit]", err)
		return
	}

	// /edit/ -> /docs/
	if strings.HasPrefix(file, "/edit/") {
		file = strings.Replace(file, "/edit/", "/docs/", 1)
	} else {
		c.Status(404)
		return
	}

	if _, err := os.Stat(file); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(file[:strings.LastIndex(file, "/")], 0755)
		if err != nil {
			panic(err)
		}
	}

	err = os.WriteFile(file, []byte(text), 0600)
	if err != nil {
		panic(err)
	}
}

func loadAsset(file string) ([]byte, error) {
	if file == "/" {
		file = "/assets/index.html"
	} else if file == "/favicon.ico" {
		file = "/assets/logo.svg"
	} else if strings.HasPrefix(file, "/edit/raw") {
		file = strings.Replace(file, "/edit/raw", "./docs", 1) + ".md"
		fmt.Println("Matched", file)
		content, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("failed to read asset file: %w", err)
		}

		return content, nil
	} else if strings.HasPrefix(file, "/edit/") {
		file = "/assets/edit.html"
	}

	if strings.HasPrefix(file, "/assets/") {
		content, err := os.ReadFile("." + file)
		if err != nil {
			return nil, fmt.Errorf("failed to read asset file: %w", err)
		}
		return content, nil
	}

	return nil, fmt.Errorf("file not found")
}

func handleGet(c *gin.Context) {
	file := c.Param("file")
	if file == "/kanban" {
		c.JSON(http.StatusOK, &kanban)
		return
	}
	content, err := loadAsset(file)
	if content == nil && err == nil {
		c.Status(404)
		return
	} else if err != nil {
		c.Status(500)
		fmt.Println("[Assets]", err)
		return
	}
	var contentType = "text/plain"
	if strings.HasSuffix(file, ".ico") {
		contentType = "image/x-icon"
	} else if strings.HasSuffix(file, ".css") {
		contentType = "text/css"
	} else if strings.HasSuffix(file, ".svg") {
		contentType = "image/svg+xml"
	} else if strings.HasSuffix(file, ".png") {
		contentType = "image/png"
	} else if strings.HasSuffix(file, ".js") {
		contentType = "text/javascript"
	} else {
		contentType = http.DetectContentType(content)
	}
	c.Data(200, contentType, content)
}

func scamAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		username, password, hasAuth := c.Request.BasicAuth()
		if hasAuth && password != "" {
			password = fmt.Sprintf("%x", password)
		}

		if !hasAuth || username != ENV_USER || password != ENV_PASS {
			c.Header("WWW-Authenticate", `Basic realm="Restricted"`)
			c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
			return
		}
		c.Next()
	}
}

// nohup go run *.go > server.log 2>&1 &
func main() {
	var webRoot, bindAddr string

	flag.StringVar(&webRoot, "web-root", "/", "sets the web root to use for the web API & UI")
	flag.StringVar(&bindAddr, "bind", "127.0.0.1"+ENV_PORT, "sets the bind address and port (format 'address:port')")
	flag.StringVar(&jsonFile, "json", "kanban.json", "sets the path of the json file to use")

	flag.Parse()

	if _, err := os.Stat(jsonFile); errors.Is(err, os.ErrNotExist) {
		kanban = KanbanData{
			Types: []Option{
				Option{Color: "#4af", Name: "Work"},
				Option{Color: "#294", Name: "Code"},
				Option{Color: "#f0f", Name: "F&F"},
				Option{Color: "#fb4", Name: "Idea"},
				Option{Color: "#ccd", Name: "Acad"},
				Option{Color: "#c6f", Name: "Q/ML"},
				Option{Color: "#888", Name: "Default"},
			},
			Lists: []List{
				List{Name: "Euclidian", Tasks: []Task{}},
				List{Name: "Al-Khwarizmic", Tasks: []Task{}},
				List{Name: "Newtonian", Tasks: []Task{}},
				List{Name: "Fourier", Tasks: []Task{}},
			},
		}
		saveKanban()
	}
	if _, err := os.Stat("docs"); errors.Is(err, os.ErrNotExist) {
		err := os.Mkdir("docs", 0755)
		if err != nil {
			panic(err)
		}
	}

	gin.SetMode(gin.ReleaseMode)

	loadKanban()

	engine := gin.Default()
	router := engine.Group(webRoot)
	router.Use(scamAuth())

	router.GET("/*file", handleGet)
	router.POST("/edit/*file", editFile)
	router.POST("/kanban", postKanban)

	fmt.Printf("Server listening at http://%s\n", bindAddr)
	engine.Run(bindAddr)
}
