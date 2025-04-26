package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

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
