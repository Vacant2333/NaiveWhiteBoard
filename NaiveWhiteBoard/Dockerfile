FROM golang:latest

# 工作目录
WORKDIR /NaiveWhiteBoard
# 将项目的所有文件移到该文件夹
ADD .  /NaiveWhiteBoard
# 设置环境变量
RUN go env -w GO111MODULE=on
RUN go env -w GOPROXY=https://goproxy.cn,direct
# 编译
RUN go build main.go
# 声明使用8000端口(Build时仍要设置端口映射8000:8000)
EXPOSE 8000
# 运行
CMD ["./main"]