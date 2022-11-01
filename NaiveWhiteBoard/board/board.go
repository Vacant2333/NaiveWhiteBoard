package board

// 白板
type whiteBoard struct {
	name    string             // 白板名称
	founder string             // 创始人的用户名
	pages   []map[int]*Element // 白板所有页面的内容
}

type Element map[string]interface{}

// 所有存在服务器中的白板数据
var boards map[string]*whiteBoard

// 初始化
func init() {
	users = make(map[string]*user)
	boards = make(map[string]*whiteBoard)
}
