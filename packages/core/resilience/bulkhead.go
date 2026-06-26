package resilience

import "sync"

// Bulkhead limits concurrent executions.
type Bulkhead struct {
	sem chan struct{}
}

func NewBulkhead(maxConcurrent int) *Bulkhead {
	return &Bulkhead{sem: make(chan struct{}, maxConcurrent)}
}

func (b *Bulkhead) Run(fn func() error) error {
	b.sem <- struct{}{}
	defer func() { <-b.sem }()
	return fn()
}

// Semaphore is an alias-style helper for counting semaphores.
type Semaphore struct {
	mu    sync.Mutex
	count int
	max   int
}

func NewSemaphore(max int) *Semaphore {
	return &Semaphore{max: max}
}

func (s *Semaphore) Acquire() {
	s.mu.Lock()
	for s.count >= s.max {
		s.mu.Unlock()
		// spin-wait simplified; production would use cond
		s.mu.Lock()
	}
	s.count++
	s.mu.Unlock()
}

func (s *Semaphore) Release() {
	s.mu.Lock()
	if s.count > 0 {
		s.count--
	}
	s.mu.Unlock()
}
