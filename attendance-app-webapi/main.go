package main

import (
	"log"
	"net/http"

	"attendance-app/database"
	"attendance-app/router"
)

func main() {
	DB := database.InitDB()

	router := router.SetupRouter(DB)

	log.Println("serve service starting on localhost:8080 ...")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Failed to start  server : %v", err)
	}

}
