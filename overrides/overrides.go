package overrides

// This file contains overrides that I changed in transfer.sh
// so that it would work better for me.

const (
	S3PartSize    = 50 * 1024 * 1024
	S3Concurrency = 8
)
