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
	readOnly bool
	kanban   KanbanData
)

func loadAsset(file string) ([]byte, error) {
	if file == "/" {
		file = "/assets/index.html"
	}

	// if /assets/
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
	if readOnly {
		c.JSON(http.StatusOK, &kanban)
		return
	}
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
	} else if strings.HasSuffix(file, ".js") {
		contentType = "text/javascript"
	} else {
		contentType = http.DetectContentType(content)
	}
	c.Data(200, contentType, content)
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
	var debug, init bool
	var webRoot, bindAddr string

	flag.StringVar(&webRoot, "web-root", "/", "sets the web root to use for the web API & UI")
	flag.StringVar(&bindAddr, "bind", "127.0.0.1:8080", "sets the bind address and port (format 'address:port')")
	flag.StringVar(&jsonFile, "json", "kanban.json", "sets the path of the json file to use")
	flag.BoolVar(&init, "init", false, "create an example json config")
	flag.BoolVar(&readOnly, "read-only", false, "runs in read-only mode")
	flag.BoolVar(&debug, "debug", false, "runs in debug mode")

	flag.Parse()

	if init {
		kanban = KanbanData{
			Priorities: []Option{
				Option{Color: "#000099", Name: "High"},
				Option{Color: "#996633", Name: "Medium"},
				Option{Color: "#ff0000", Name: "Low"},
			},
			Types: []Option{
				Option{Color: "#000099", Name: "Generic"},
				Option{Color: "#996633", Name: "Tickets"},
				Option{Color: "#ff0000", Name: "Critical"},
			},
			Lists: []List{
				List{Name: "Todo", Tasks: []Task{}},
				List{Name: "Low Priority", Tasks: []Task{}},
				List{Name: "In Progress", Tasks: []Task{}},
				List{Name: "Waiting Feedback", Tasks: []Task{}},
				List{Name: "Completed", Tasks: []Task{}},
			},
			Bin: []Task{},
		}
		saveKanban()
		return
	}

	if _, err := os.Stat(jsonFile); errors.Is(err, os.ErrNotExist) {
		panic("'" + jsonFile + "' does not exists.")
	} else if !debug {
		gin.SetMode(gin.ReleaseMode)
	}

	loadKanban()

	engine := gin.Default()
	router := engine.Group(webRoot)
	router.GET("/*file", handleGet)
	router.POST("/kanban", postKanban)

	fmt.Printf("Server listening at http://%s\n", bindAddr)
	engine.Run(bindAddr)
}
