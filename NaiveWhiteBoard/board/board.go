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

// 给该Board的所有用户发送信息
func (board *WhiteBoard) sendMessageToAll(msg *Message, page int, expectUser string) {
	for name := range board.Users {
		// page为-1则不限页面
		if (Users[name].Page == page || page == -1) && name != expectUser {
			Users[name].sendMessage(msg)
		}
	}
}

// 添加元素,并且通知所有的用户
func (board *WhiteBoard) modifyElement(element Element, page int, actionUser string) {
	elementId := int(element["id"].(float64))
	board.Pages[page][elementId] = element
	msg := &Message{
		Action: "modifyElement",
		Value:  element,
	}
	board.sendMessageToAll(msg, page, actionUser)
}

// 删除元素,并且通知所有用户
func (board *WhiteBoard) removeElement(elementID int, page int, actionUser string) {
	msg := &Message{
		Action: "removeElement",
		Value:  elementID,
	}
	// 删除存在服务端的Element
	delete(board.Pages[page], elementID)
	board.sendMessageToAll(msg, page, actionUser)
}
