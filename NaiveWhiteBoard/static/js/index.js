// 缩放限制
const minZoom = 0.5;
const maxZoom = 5;

// 画布中所有的元素
let elements;

// 初始化画布
var canvas = new fabric.Canvas('board', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#f2f2f2",
});
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#B2CCFF';
fabric.Object.prototype.cornerSize = 9;
fabric.Object.prototype.cornerStyle = 'circle';

/* 左侧功能 */
// 分组/取消分组
$("#group").click(function () {
    if (!canvas.getActiveObject()) {
        return;
    }
    if (canvas.getActiveObject().type !== 'activeSelection') {
        return;
    }
    canvas.getActiveObject().toGroup();
    canvas.requestRenderAll();
})
$("#ungroup").click(function () {
    if (!canvas.getActiveObject()) {
        return;
    }
    if (canvas.getActiveObject().type !== 'group') {
        return;
    }
    canvas.getActiveObject().toActiveSelection();
    canvas.requestRenderAll();
})
// 画布自适应窗口大小
window.onresize = function () {
    canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
    });
}
// 鼠标滚轮调整缩放
canvas.on('mouse:wheel', function (opt){
    let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY;
    if (zoom > maxZoom) zoom = maxZoom;
    if (zoom < minZoom) zoom = minZoom;
    // 以鼠标所在位置为原点缩放
    canvas.zoomToPoint(
        {
            x: opt.e.offsetX,
            y: opt.e.offsetY
        }, zoom
    );
    opt.e.preventDefault();
    opt.e.stopPropagation();
})
// 阻止右键菜单
document.body.oncontextmenu = function(e){
    return false;
};
// 右键拖拽移动画布
canvas.on('mouse:down:before', function(opt) {
    if(opt.e.button === 2) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = opt.e.clientX;
        this.lastPosY = opt.e.clientY;
        this.setCursor("move");
    }
});
canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
        var e = opt.e;
        var vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
        this.setCursor("move");
    }
});
canvas.on('mouse:up:before', function() {
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
    this.setCursor("default");
});
// 删除键删除元素
document.onkeydown = function (e) {
    if(e.code === "Backspace") {
        if(canvas.getActiveObjects().length === 1 && canvas.getActiveObject().type === "i-text") {
            // 选中的文字区域,不执行删除
        } else {
            canvas.getActiveObjects().forEach(function (c) {
                canvas.remove(c);
            });
            canvas.discardActiveObject(null);
        }
    }
}
// 添加元素
function addElement(type) {
    let ele;
    switch(type) {
        case "Rect":
            ele = new fabric.Rect();
            break;
        case "Circle":
            ele = new fabric.Circle({radius: 50});
            break;
        case "Triangle":
            ele = new fabric.Triangle();
            break;
        case "IText":
            ele = new fabric.IText("请输入内容...");
            break;
    }
    ele.set({
        "stroke": "black",
        "width": 200,
        "height": 200,
        "left": window.innerWidth/2-100,
        "top": window.innerHeight/2-100,
        "fill": "",
        "strokeWidth": 2,
    });
    // 元素的固定ID
    ele.id = Math.floor(Math.random()*10000000)
    // 存入本地
    elements[ele.id] = ele
    // 通知服务端添加一个元素
    ws.send(JSON.stringify({
        "Action": "addElement",
        "Value": ele,
    }));
    canvas.add(ele);
    canvas.setActiveObject(ele);
}
// 重绘画布(加入时同步画布)
function resetCanvas(data) {
    canvas.clear();
    elements = Object.values(data);
    // 遍历所有从服务器传来的Element,通过这些Element生成对象
    elements.forEach(function (element) {
        drawElement(element)
    });
}
// 根据服务器传来的数据来添加元素
function drawElement(element) {
    let temp = fabric.util.getKlass(element["type"]);
    temp.fromObject(element, function (obj) {
        canvas.add(obj);
        elements[element.id] = element
    });
}

/* WebSocket */
// 初始化WebSocket
let ws = new WebSocket("ws://" + window.location.host + "/connect")
ws.onopen = function() {
    $(".join").show();
};
ws.onclose = function () {
    tip("连接至服务器失败,请稍后重试");
}
ws.onmessage = function(e) {
    let reply = JSON.parse(e.data)
    switch (reply["Action"]) {
        case "createWhiteBoard":
            if(reply["Success"]) {
                // 创建成功,进入主界面
                $(".join").hide();
                $(".mask").hide();
                tip("白板创建成功!");
            } else {
                tip("白板已存在,您可加入该白板");
            }
            break;
        case "joinWhiteBoard":
            if(reply["Success"]) {
                // 加入成功,进入主界面
                $(".join").hide();
                $(".mask").hide();
                // 加入时同步画布数据
                resetCanvas(reply["Value"])
                tip("加入白板成功!");
            } else {
                tip("白板不存在,您可创建该白板");
            }
            break;
    }
}
// 创建白板
function createWhiteBoard() {
    let name = $("#boardName").val();
    if(name.length > 0) {
        ws.send(JSON.stringify({
            "Action": "createWhiteBoard",
            "Value": name,
        }));
    } else {
        tip("请输入白板名称");
    }
}
// 加入白板
function joinWhiteBoard() {
    let name = $("#boardName").val();
    if(name.length > 0) {
        ws.send(JSON.stringify({
            "Action": "joinWhiteBoard",
            "Value": name,
        }));
    } else {
        tip("请输入白板名称");
    }
}



/* 公用方法 */
function tip(s) {
    document.querySelector("#toastBar").MaterialSnackbar.showSnackbar({message: s});
}