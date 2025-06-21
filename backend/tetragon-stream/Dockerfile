FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o tetragon-stream .

FROM alpine:latest
RUN apk --no-cache add ca-certificates kubectl
WORKDIR /root/

COPY --from=builder /app/tetragon-stream .

EXPOSE 8090

CMD ["./tetragon-stream"] 