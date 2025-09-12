package blocklist

import (
	"sync"
	"time"
)

var (
	blocklistedTokens = make(map[string]time.Time)
	mutex             = &sync.RWMutex{}
)

func Add(token string, expiration time.Duration) {
	mutex.Lock()
	defer mutex.Unlock()
	blocklistedTokens[token] = time.Now().Add(expiration)
}

func IsBlocklisted(token string) bool {
	mutex.RLock()
	defer mutex.RUnlock()
	expiration, ok := blocklistedTokens[token]
	if !ok {
		return false
	}
	if time.Now().After(expiration) {
		delete(blocklistedTokens, token)
		return false
	}
	return true
}
