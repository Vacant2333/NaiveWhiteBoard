const minZoom = 0.5;
const maxZoom = 5;
const newLeft = 300;
const newTop = 300;

var canvas = new fabric.Canvas('board', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#f2f2f2"
});
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#B2CCFF';
fabric.Object.prototype.cornerSize = 9;
fabric.Object.prototype.cornerStyle = 'circle';

function Add() {
    var rect = new fabric.Rect({
        left: newLeft,
        top: newTop,
        fill: '',
        width: 200,
        height: 100,
        objectCaching: false,
        stroke: 'black',
        strokeWidth: 4,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
}

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
    })
}
// 鼠标滚轮调整缩放
canvas.on('mouse:wheel', function (opt){
    let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY
    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom
    // 以鼠标所在位置为原点缩放
    canvas.zoomToPoint(
        {
            x: opt.e.offsetX,
            y: opt.e.offsetY
        }, zoom
    )
    opt.e.preventDefault()
    opt.e.stopPropagation()
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
        this.setCursor("move")
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
        this.setCursor("move")
    }
});
canvas.on('mouse:up:before', function() {
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
    this.setCursor("default")
});
// 删除键删除元素
document.onkeydown = function (e) {
    if(e.code === "Backspace") {
      canvas.getActiveObjects().forEach(function (c) {
          canvas.remove(c)
      });
      canvas.discardActiveObject(null)
    }
}
// 添加元素
function addElement(e) {

}