VERSION 0.8
PROJECT jahands/docker

dockercontext:
	FROM busybox
	WORKDIR /work
	COPY . .
	SAVE ARTIFACT /work

docker:
	FROM +dockercontext
	FROM DOCKERFILE .
	SAVE IMAGE --push gitea.uuid.rocks/docker/transfer-sh:latest

