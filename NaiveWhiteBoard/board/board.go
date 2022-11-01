package board

// WhiteBoard 白板
type WhiteBoard struct {
	Name    string   // 白板名称
	Creator string   // 创建者
	Pages   []Page   // 白板所有页面的内容
	Users   []string // 所有已加入该白板的用户,更新信息时直接通过WebSocket通知
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
func (board *WhiteBoard) addElement(element Element, page int) {
	elementId := int(element["id"].(float64))
	board.Pages[page][elementId] = element
	board.updateElement(page, elementId)
}

// 通知所有用户更新某个Element,传入ID
func (board *WhiteBoard) updateElement(page int, id int) {
	msg := &Message{
		Action: "updateElement",
		Value:  board.Pages[page][id],
	}
	// 通知page对应的用户更新
	for _, userName := range board.Users {
		if Users[userName].Page == page {
			Users[userName].sendMessage(msg)
		}
	}
}
