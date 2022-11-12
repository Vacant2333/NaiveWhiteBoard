// 粘贴板
let clipboard;
// 初始化画布
let canvas = new fabric.Canvas('board', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#e0e0e0",
    stopContextMenu: true, // 屏蔽右键
});
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#B2CCFF';
fabric.Object.prototype.cornerSize = 9;
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.objectCaching = false;

// 画布自适应窗口大小
window.onresize = function () {
    canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
    });
};
// 鼠标滚轮调整缩放画布
canvas.on('mouse:wheel', function (opt){
    let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY;
    if(zoom > 5) zoom = 5;
    if(zoom < 0.5) zoom = 0.5;
    // 以鼠标所在位置为原点缩放
    canvas.zoomToPoint({
        x: opt.e.offsetX,
        y: opt.e.offsetY,
    }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});
// 多选内容状态改变时同步
canvas.on('selection:created', function () {
    let group = canvas.getActiveObject();
    if(group != null && group._objects != null && group._objects.length > 1) {
        // 选中了多个元素,建立多选时给多选对象添加改变事件
        group.on("modified", function () {
            for(let ele of canvas.getActiveObjects()) {
                ws.sendMessage("modifyElement", objToMap(ele));
            }
        });
    } else if(group != null && group.id != null) {
        // 选中的是单个元素
        customize.show(500);
        // 更新窗口
        updateCustomize(group);
    }
});
// 取消选中
canvas.on("before:selection:cleared", function () {
    let group = canvas.getActiveObject();
    if(group != null && group.id != null) {
        // 选中的是单个元素
        customize.hide(500);
    }
});
// 选中更新
canvas.on("selection:updated", function () {
    let group = canvas.getActiveObject();
    if(group != null && group.id != null) {
        // 选中的是单个元素,更新自定义区
        updateCustomize(group);
    }
});
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
    if(this.isDragging) {
        let e = opt.e;
        let vpt = this.viewportTransform;
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
// 根据ID获得某个元素
canvas.getElementById = function (id) {
    for(const element of canvas.getObjects()) {
        if(element.id === id) {
            return element;
        }
    }
    return null;
};
// 删除键删除元素
document.onkeydown = function (e) {
    if(e.code === "Backspace") {
        if(canvas.getActiveObjects().length === 1 && canvas.getActiveObject().type === "i-text") {
            // 选中的文字区域,不执行删除
        } else {
            canvas.getActiveObjects().forEach(function (target) {
                canvas.remove(canvas.getElementById(target.id));
                ws.sendMessage("removeElement", target.id);
            });
            canvas.discardActiveObject();
        }
    }
};
// 复制
document.oncopy = function () {
    // 将复制的对象保存
    canvas.getActiveObject().clone(function(cloned) {
        clipboard = cloned;
    });
};
// 粘贴
document.onpaste = function () {
    if(canvas.isLock()) {
        tip("白板已锁定");
        return;
    }
    clipboard.clone(function(clonedObj) {
        canvas.discardActiveObject();
        clonedObj.set({
            left: clonedObj.left + 20,
            top: clonedObj.top + 20,
            evented: true,
        });
        if(clonedObj.type === 'activeSelection') {
            // 复制的是一组对象
            clonedObj.canvas = canvas;
            clonedObj.forEachObject(function(obj) {
                // 需要新给一个ID,不然会覆盖
                obj.id = randId();
                canvas.add(obj);
                canvas.renderAll();
                ws.sendMessage("modifyElement", objToMap(obj));
            });
            clonedObj.setCoords();
        } else {
            // 复制的是单个对象,需要新给一个ID,不然会覆盖
            clonedObj.id = randId();
            setModifyEvent(clonedObj);
            canvas.add(clonedObj);
            ws.sendMessage("modifyElement", clonedObj);
        }
        // 向右下位移
        clipboard.top += 20;
        clipboard.left += 20;
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    });
};
// 功能区添加元素
canvas.addElement = function (type) {
    if(canvas.isLock()) {
        tip("白板已锁定");
        return;
    }
    let ele;
    switch(type) {
        case "Line":
            ele = new fabric.Line();
            break;
        case "Circle":
            ele = new fabric.Circle({radius: 50});
            break;
        case "Rect":
            ele = new fabric.Rect();
            break;
        case "Triangle":
            ele = new fabric.Triangle();
            break;
        case "IText":
            ele = new fabric.IText("输入内容...");
            break;
    }
    ele.set({
        // 元素的固定ID
        "id": randId(),
        "stroke": "#000000",
        "width": 200,
        "height": 200,
        "left": window.innerWidth/2-100,
        "top": window.innerHeight/2-100,
        "fill": "",
        "strokeWidth": 2,
        // 不固定到中心会导致Circle的位置对不上
        "originX": "center",
        "originY": "center",
        "radius": 100,
    });
    // 更改事件
    setModifyEvent(ele);
    // 通知服务端添加元素
    ws.sendMessage("modifyElement", ele);
    if(canvas.isDrawingMode) {
        // 关闭铅笔模式
        pencilMode();
    }
    canvas.add(ele);
    canvas.setActiveObject(ele);
};
// 重绘画布
canvas.resetCanvas = function (data) {
    // 删除画布所有元素
    for(const ele of canvas.getObjects()) {
        canvas.remove(ele);
    }
    if(data != null) {
        // 遍历所有从服务器传来的Element,通过这些Element生成对象
        Object.values(data).forEach(function (element) {
            canvas.drawElement(element);
        });
    }
    // 设置已锁定
    canvas.setLock(canvas.isLock(), false);
};
// 根据服务器传来的数据来添加/修改元素
canvas.drawElement = function (element) {
    let temp = fabric.util.getKlass(element["type"], "");
    temp.fromObject(element, function (ele) {
        if(canvas.getElementById(ele.id) !== null) {
            // 如果这个元素已存在,要删除之前那个
            canvas.remove(canvas.getElementById(ele.id));
        }
        // 更改事件
        setModifyEvent(ele);
        if(ele.matrixCache != null) {
            ele.left = ele.matrixCache.value[4];
            ele.top = ele.matrixCache.value[5];
        }
        canvas.add(ele);
    });
};
// 设置锁定
canvas.setLock = function (lock, sendTip) {
    for(let ele of canvas.getObjects()) {
        // 根据锁定设置是否可选中
        ele.selectable = !lock;
    }
    if(lock) {
        $("#lock").text("lock");
        if(sendTip) {
            tip("白板已锁定");
        }
        // 清空已选内容
        canvas.discardActiveObject();
        if(canvas.isDrawingMode) {
            // 关闭铅笔模式
            pencilMode();
        }
    } else {
        $("#lock").text("lock_open");
        if(sendTip) {
            tip("白板已解锁");
        }
    }
    canvas.requestRenderAll();
};
// 获得是否已锁
canvas.isLock = function () {
    return $("#lock").text() === "lock";
};
// 同步铅笔对象
canvas.on("object:added", function (e) {
    if(e.target.type === "path" && e.target.id == null) {
        e.target.id = randId();
        setModifyEvent(e.target);
        ws.sendMessage("modifyElement", e.target);
    }
});
// 设置element的modify事件
function setModifyEvent(obj) {
    if(obj.__eventListeners != null) {
        obj.__eventListeners["modified"] = null;
    }
    obj.on("modified", function () {
        // 通知服务端修改元素
        ws.sendMessage("modifyElement", obj);
    });
}