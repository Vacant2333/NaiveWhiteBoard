FROM golang:1.17.7

# 工作目录
WORKDIR /board/NaiveWhiteBoard
# 将项目的所有文件移到该文件夹
ADD .  /board

RUN go env -w GO111MODULE=on
RUN go env -w GOPROXY=https://goproxy.cn,direct

RUN go mod init search
RUN go build main.go


#RUN go build -o main main.go

EXPOSE 8000

CMD ["./main"]