package main

type Comment struct {
	Comment string `json:"comment"`
	Time    uint64 `json:"time"`
}

type Task struct {
	Comments    []Comment `json:"comments"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Type        string    `json:"type"`
	Deadline    string    `json:"deadline"`
	Creation    uint64    `json:"creation"`
	Removed     uint64    `json:"removed"`
}

type List struct {
	Name  string `json:"name"`
	Tasks []Task `json:"tasks"`
}

type Option struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type KanbanData struct {
	Types    []Option `json:"types"`
	Lists    []List   `json:"lists"`
	Bin      []Task   `json:"bin"`
	ReadOnly bool     `json:"readOnly"`
}
