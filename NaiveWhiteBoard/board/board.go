package board

import (
	"strconv"
)

// WhiteBoard 白板
type WhiteBoard struct {
	Name    string          // 白板名称
	Creator *User           // 创建者
	Lock    bool            // 锁定
	Pages   map[string]Page // 白板所有页面的内容
	Users   map[string]bool // 所有已加入该白板的用户
}

// 默认页面不可被删除,默认加入时进入该页面
const defaultPage = "默认页面"

// Page 页面内容
type Page = map[int]Element

// Element 元素内容
type Element = map[string]interface{}

// Boards 所有存在服务器中的白板数据
var Boards map[string]*WhiteBoard

// 初始化
func init() {
	Users = make(map[string]*User)
	Boards = make(map[string]*WhiteBoard)
}

// 给该Board的所有用户发送信息
func (board *WhiteBoard) sendMessageToAll(msg *Message, page string, expectUser string) {
	for name := range board.Users {
		// page为""则为全局信息
		if (Users[name].Page == page || page == "") && name != expectUser {
			Users[name].sendMessage(msg)
		}
	}
}

// 添加元素,并且通知所有的用户
func (board *WhiteBoard) modifyElement(element Element, page string, actionUser string) {
	elementId := int(element["id"].(float64))
	board.Pages[page][elementId] = element
	board.sendMessageToAll(&Message{
		Action:  "modifyElement",
		Value:   element,
		Success: true,
	}, page, actionUser)
}

// 删除元素,并且通知所有用户
func (board *WhiteBoard) removeElement(elementID int, page string, actionUser string) {
	// 删除存在服务端的Element
	delete(board.Pages[page], elementID)
	board.sendMessageToAll(&Message{
		Action:  "removeElement",
		Value:   elementID,
		Success: true,
	}, page, actionUser)
}

// 从配置文件读取内容到页面中,并通知所有用户刷新页面
func (board *WhiteBoard) readConfigFromJson(pageJson interface{}, page string) {
	// 清空页面内容
	board.Pages[page] = make(map[int]Element)
	// 遍历所有的element,逐个转换类型
	for sid, element := range pageJson.(map[string]interface{}) {
		// 实际类型是map[int]interface{} 但是自动转为了string,这里把id转回来
		id, _ := strconv.Atoi(sid)
		board.Pages[page][id] = element.(Element)
	}
	// 通知所有用户刷新页面
	board.sendMessageToAll(&Message{
		Action:  "modifyPage",
		Value:   board.Pages[page],
		Success: true,
	}, page, "")
}

// 修改锁定模式
func (board *WhiteBoard) setLock(lock bool) {
	board.Lock = lock
	// 通知所有用户锁定/解锁白板
	board.sendMessageToAll(&Message{
		Action:  "lockBoard",
		Value:   lock,
		Success: true,
	}, "", "")
}

// 添加页面
func (board *WhiteBoard) addPage(pageName string, userName string) bool {
	if _, ok := board.Pages[pageName]; ok {
		// 页面已存在
		return false
	}
	board.Pages[pageName] = map[int]Element{}
	// 通知所有用户添加页面
	board.sendMessageToAll(&Message{
		Action:  "addPage",
		Value:   pageName,
		Success: true,
	}, "", userName)
	return true
}

// 删除页面
func (board *WhiteBoard) removePage(name string) {
	delete(board.Pages, name)
	board.sendMessageToAll(&Message{
		Action:  "removePage",
		Value:   name,
		Success: true,
	}, "", "")
}
