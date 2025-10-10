package blocklist

import (
	"errors"
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

func IsBlocklisted(token string) error {
	mutex.RLock()
	defer mutex.RUnlock()
	expiration, ok := blocklistedTokens[token]
	if ok {
		err := errors.New("logged out")
		return err
	}
	if time.Now().After(expiration) {
		delete(blocklistedTokens, token)
		return nil
	}
	return nil
}
