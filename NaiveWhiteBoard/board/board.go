package board

// WhiteBoard 白板
type WhiteBoard struct {
	Name    string          // 白板名称
	Creator string          // 创建者
	Pages   []Page          // 白板所有页面的内容
	Users   map[string]bool // 所有已加入该白板的用户
}

type Page map[int]Element
type Element map[string]interface{}

// Boards 所有存在服务器中的白板数据
var Boards map[string]*WhiteBoard

// 初始化
func init() {
	Users = make(map[string]*User)
	Boards = make(map[string]*WhiteBoard)
}

// 添加元素,并且通知所有的用户
func (board *WhiteBoard) modifyElement(element Element, page int, expectUser string) {
	elementId := int(element["id"].(float64))
	board.Pages[page][elementId] = element
	msg := &Message{
		Action: "modifyElement",
		Value:  element,
	}
	// 通知page对应的用户更新
	for name := range board.Users {
		if Users[name].Page == page && name != expectUser {
			Users[name].sendMessage(msg)
		}
	}
}
