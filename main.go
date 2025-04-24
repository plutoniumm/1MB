package main

import (
	"encoding/json"
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

func loadAsset(file string) ([]byte, error) {
	if file == "/" {
		file = "/assets/index.html"
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

func postKanban(c *gin.Context) {
	var data KanbanData
	err := c.BindJSON(&data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}
	kanban = data
	saveKanban()
	c.JSON(http.StatusOK, &data)
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

func saveKanban() {
	bytes, _ := json.Marshal(&kanban)
	err := os.WriteFile(jsonFile, bytes, 0600)
	if err != nil {
		panic(err)
	}
}

func loadKanban() {
	content, err := os.ReadFile(jsonFile)
	if err != nil {
		panic(err)
	} else if err = json.Unmarshal(content, &kanban); err != nil {
		panic(err)
	}
}

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
				Option{Color: "#d30", Name: "Family"},
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
	gin.SetMode(gin.ReleaseMode)

	loadKanban()

	engine := gin.Default()
	router := engine.Group(webRoot)
	router.Use(scamAuth())

	router.GET("/*file", handleGet)
	router.POST("/kanban", postKanban)

	fmt.Printf("Server listening at http://%s\n", bindAddr)
	engine.Run(bindAddr)
}
