/*!
 *Last modified: 2022-09-25 12:07:37
 *名称: axTree.js
 *简介: tree树菜单的js文件
 *用法: new axTree('#id',{参数})
 *版本: v1.0.1
 *演示: https://www.axui.cn/v2.0/ax-tree.php
 *客服: 3217728223@qq.com
 *交流: QQ群952502085
 *作者: AXUI团队
 */
class axTree {
    constructor(targetDom, options) {
        this.targetDom = axIdToDom(targetDom);
        this.options = axExtend({
            toggle: true, 
            collapse: true, 
            disabled: [], 
            expand: [], 
            checked: [], 
            selected: '', 
            oneSelected: true, 
            arrowIcon: ['ax-icon-right', 'ax-icon-right', 'ax-none'], 
            parentIcon: ['ax-icon-folder', 'ax-icon-folder-open'], 
            childIcon: 'ax-icon-file-text', 
            iconShow: false, 
            checkboxIcon: ['ax-icon-square', 'ax-icon-check-s', 'ax-icon-check-s-f'], 
            radioIcon: ['ax-icon-circle', 'ax-icon-radio', 'ax-icon-radio-f'], 
            checkShow: false, 
            checkType: 'checkbox', 
            checkMin: 0, 
            checkMax: 1000000, 
            linkage: true, 
            oneRadio: false, 
            readonly: '', 
            url: '', 
            cookie: '', 
            inputWidth: '', 
            toolsShow: false, 
            toolsAction: 'hover', 
            addTools: [], 
            firstFloor: 0, 
            draggable: false, 
            line: false,
            data: '', 
            async: '',
            ajaxType:'post',
            delay: 0,
            fields: '',
            removeBefore: function (item, dom) {
                return true;
            },
            remove: function (id) {
            },
            getCheckeds: function (obj, arr) {
            },
        }, options, this.targetDom);
        this.handlers = {};
        this.checked = [];
        this.checkeds = [];
        this.expand = [];
        this.expands = [];
        this.selected = this.options.selected;
        if (this.options.oneSelected && !axIsEmpty(this.selected)) {
            this.selected.shift();
        }
        this.selecteds = [];
        this.disabled = this.options.disabled;
        this.disableds = [];
        this.searchs = [];
        this.readonlys = [];
        this.arrowSame = this.options.arrowIcon[0] == this.options.arrowIcon[1] ? true : false;
        this.arrow = axAddElem('i', { class: 'ax-arrow ax-iconfont' });
        this.checkIcon = {
            checkbox: [
                '<i class="ax-check ax-iconfont ' + this.options.checkboxIcon[0] + '"></i>',
                '<i class="ax-check ax-iconfont ' + this.options.checkboxIcon[1] + '"></i>',
                '<i class="ax-check ax-iconfont ' + this.options.checkboxIcon[2] + '"></i>'
            ],
            radio: [
                '<i class="ax-check ax-iconfont ' + this.options.radioIcon[0] + '"></i>',
                '<i class="ax-check ax-iconfont ' + this.options.radioIcon[1] + '"></i>',
                '<i class="ax-check ax-iconfont ' + this.options.radioIcon[2] + '"></i>'
            ],
        };
        this.fileIcon = '';
        if (this.options.iconShow) {
            this.fileIcon = {
                parent: '<i class="ax-type ax-iconfont ' + this.options.parentIcon[0] + '"></i>',
                child: '<i class="ax-type ax-iconfont ' + this.options.childIcon + '"></i>'
            }
        }
        this.maxFloor = 0;
        this.init();
    }
    init() {
        let _this = this;
        if (axType(this.options.data) == 'String' && this.options.async) {
            if (this.options.async == 'json') {
                axAjax({
                    url: this.options.data,
                    type:this.options.ajaxType,
                    success: function (content) {
                        _this.toTree(content);
                        _this.targetDom.innerHTML = '';
                        _this.dataProcess(_this.treeData);
                    }
                }, this.targetDom);
            } else if (this.options.async == 'sql') {
                axAjax({
                    data: { pId: _this.options.firstFloor },
                    type:this.options.ajaxType,
                    url: this.options.data,
                    success: function (content) {
                        _this.toTree(content);
                        _this.targetDom.innerHTML = '';
                        _this.dataProcess(_this.treeData);
                    }
                }, this.targetDom);
            }
        } else {
            if (axType(this.options.data) == 'Array') {
                this.toTree(this.options.data);
            } else if (this.options.data.nodeType == 1 || this.options.data.substr(0, 1) == '#') {
                this.treeData = axUlToArr(this.options.data, this.options.firstFloor + 1, true);
                this.targetDom.innerHTML = '';
            }
            this.dataProcess(this.treeData);
        }
    }
    toTree(data) {
        if (data[0].hasOwnProperty('pId')) {
            this.treeData = axArrToTree(data, this.options.firstFloor);
        } else {
            this.treeData = data;
        }
    }
    newItemStart(data) {
        let ids = [],
            start;
        data.forEach(i => {
            ids.push(i.id);
        });
        start = Math.max(...ids) + 1;
        return start;
    }
    dataProcess(data) {
        let _this = this;
        this.flatData = this.flatTree(data);
        this.newItemStart(this.flatData);
        this.setAttribute();
        if (!this.fixChecked(this.flatData)) {
            return false;
        }
        this.refreshTree(data);
        this.fixExpand(this.flatData)
        this.arrayToDom(data);
        this.flatData.forEach((item) => {
            if (axIsEmpty(this.expand) && !this.options.collapse && item.children) {
                item.expand = false;
                this.ulToggle(item);
            }
            this.renderFinish(item, _this.flatData);
        });
        'init' in _this.handlers ? _this.emit('init', '') : null;
    }
    setAttribute() {
        if (this.options.line) {
            this.targetDom.setAttribute('line', '');
        }
    }
    dragPlace(e, node) {
        let topOffset = node.getBoundingClientRect().top,
            bottomOffset = node.getBoundingClientRect().bottom,
            oneThird = ((node.getBoundingClientRect().bottom - node.getBoundingClientRect().top) / 3),
            upOffset = topOffset + ~~oneThird,
            downOffset = bottomOffset - ~~oneThird,
            placement = 'child';
        if (e.clientY < upOffset) {
            placement = 'up';
        } else if (e.clientY > downOffset) {
            placement = 'down';
        }
        return placement;
    }
    resetRelation(item, parent, oldParent, moveTo) {
        let setValue = (obj, target) => {
            if (moveTo == '1-0') {
                obj.pId = this.options.firstFloor;
                obj.path = this.options.firstFloor + '-' + obj.id;
                obj.floor = 1;
                obj.dom.querySelector('.ax-indent').innerHTML = '';
            } else if (moveTo == '0-1' || moveTo == 'other' || !moveTo) {
                obj.pId = target.id;
                obj.path = target.path + '-' + obj.id;
                obj.floor = target.floor + 1;
                obj.dom.querySelector('.ax-indent').innerHTML = '<i></i>'.repeat(obj.floor - 1);
            } else {
            }
        }
        let eachTraverse = (obj, target) => {
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(i => {
                    setValue(i, obj);
                    eachTraverse(i, obj);
                });
            } else {
                setValue(obj, target);
            }
        };
        setValue(item, parent);
        eachTraverse(item, parent);
        if (moveTo == '0-1') {
            this.treeData = this.treeData.filter(i => i.id != item.id);
        } else if (moveTo == '0-0') {
        } else if (moveTo == '1-0') {
        } else {
            oldParent.children = oldParent.children.filter(i => i.id != item.id);
        }
    }
    openParentBorn(item, insert, oldParent, moveTo) {
        let ul = item.dom.nextElementSibling;
        if (insert) {
            let insertLi = insert.dom.parentElement;
            this.resetRelation(insert, item, oldParent, moveTo);
            if (!item.expand) {
                item.dom.setAttribute('expand', 'true');
                item.expand = true;
                ul.style.display = 'block';
            }
            item.children.unshift(insert);
            ul.insertAdjacentElement('afterBegin', insertLi);
        }
    }
    childToParentBorn(item, insert, oldParent, moveTo) {
        let _this = this;
        if (item.children) {
            return false;
        } else {
            let ul = axAddElem('ul', { style: 'display:block' }),
                arrow = item.dom.querySelector('.ax-arrow');
            arrow.classList.remove(this.options.arrowIcon[2]);
            arrow.classList.add(this.options.arrowIcon[0]);
            item.dom.setAttribute('expand', 'true');
            item.expand = true;
            item.children = [];
            if (insert) {
                let insertLi = insert.dom.parentElement;
                this.resetRelation(insert, item, oldParent, moveTo);
                item.children.unshift(insert);
                ul.insertAdjacentElement('afterBegin', insertLi);
            }
            item.dom.insertAdjacentElement('afterEnd', ul);
            arrow.onclick = function () {
                _this.ulToggle(item);
            }
        }
    }
    dropItem(item, insert, oldParent, placement, moveTo) {
        let _this = this,
            insertDom = insert.dom,
            insertLi = insertDom.parentElement,
            itemParent = this.flatData.filter(i => item.pId == i.id.toString())[0],
            itemLi = item.dom.parentElement,
            insertPlace = (placement == 'up') ? 'beforeBegin' : (placement == 'down') ? 'afterEnd' : '',
            newNode = (place) => {
                this.resetRelation(insert, itemParent, oldParent, moveTo);
                if (moveTo == '0-0') {
                    let insertIndex = this.treeData.indexOf(insert),
                        itemIndex = this.treeData.indexOf(item);
                    if (place == 'up') {
                        axMoveArr(this.treeData, insertIndex, itemIndex);
                    } else if (place == 'down') {
                        axMoveArr(this.treeData, insertIndex, itemIndex + 1);
                    }
                } else if (moveTo == '1-0') {
                    let itemIndex = this.treeData.indexOf(item),
                        index;
                    if (place == 'up') {
                        index = itemIndex;
                    } else if (place == 'down') {
                        index = itemIndex + 1;
                    }
                    this.treeData.splice(index, 0, insert);
                } else {
                    let itemIndex = itemParent.children.indexOf(item),
                        index;
                    if (place == 'up') {
                        index = itemIndex;
                    } else if (place == 'down') {
                        index = itemIndex + 1;
                    }
                    itemParent.children.splice(index, 0, insert);
                }
                itemLi.insertAdjacentElement(insertPlace, insertLi);
            };
        if (placement == 'up') {
            if (itemLi.previousElementSibling == insertLi) {
                return false;
            }
            newNode('up');
        } else if (placement == 'down') {
            if (itemLi.nextElementSibling == insertLi) {
                return false;
            }
            newNode('down');
        } else {
            if (item.children) {
                this.openParentBorn(item, insert, oldParent, moveTo);
            } else {
                this.childToParentBorn(item, insert, oldParent, moveTo);
            }
        }
        insertDom.setAttribute('tabindex', '-1');
        insertDom.focus();
        insertDom.onblur = function () {
            insertDom.removeAttribute('tabindex');
        }
        'dropped' in _this.handlers ? _this.emit('dropped', item, insert) : null;
    }
    ulToggle(obj, linkage = true) {
        let _this = this,
            div = obj.dom,
            arrow = div.querySelector('.ax-arrow'),
            type = div.querySelector('.ax-type'),
            ul = div.nextElementSibling;
        if (obj.expand == true) {
            obj.expand = false;
            div.removeAttribute('expand');
            if (!this.arrowSame) {
                arrow.classList.remove(this.options.arrowIcon[1]);
                arrow.classList.add(this.options.arrowIcon[0]);
            }
            if (this.options.iconShow) {
                type.classList.remove(this.options.parentIcon[1]);
                type.classList.add(this.options.parentIcon[0]);
            }
            this.eachExapand(obj);
            axSlideUp(ul);
            'collapse' in _this.handlers ? _this.emit('collapse', obj) : null;
        } else {
            obj.expand = true;
            div.setAttribute('expand', 'true');
            if (!this.arrowSame) {
                arrow.classList.remove(this.options.arrowIcon[0]);
                arrow.classList.add(this.options.arrowIcon[1]);
            }
            if (this.options.iconShow) {
                type.classList.remove(this.options.parentIcon[0]);
                type.classList.add(this.options.parentIcon[1]);
            }
            this.eachExapand(obj);
            axSlideDown(ul);
            'expand' in _this.handlers ? _this.emit('expand', obj) : null;
            if (linkage) {
                this.siblingsCollapse(this.flatData, obj);
            }
        }
    };
    clickCheck(item, data) {
        let _this = this,
            checkDom = item.dom.querySelector('.ax-check');
        checkDom.onclick = function () {
            if (!checkDom || item.disabled) {
                return false;
            }
            if (_this.checkeds.length > _this.options.checkMax && !item.checked) {
                console.warn('The length of checked is too much!');
                'tooMuch' in _this.handlers ? _this.emit('tooMuch', _this.checkeds.length, _this.options.checkMax) : null;
                return false;
            }
            if (_this.options.checkType == 'checkbox') {
                if (item.checked == true) {
                    item.checked = false;
                } else {
                    item.checked = true;
                }
                _this.eachCheckbox(item, _this.options.linkage);
                _this.options.getCheckeds && _this.options.getCheckeds.call(_this, item, _this.checkeds);
            } else if (_this.options.checkType == 'radio') {
                let brothers = data.filter(i => i.pId == item.pId);
                if (brothers.some(i => i.checked == true && i.disabled == true)) {
                    console.warn('You must uncheck the disabled item that have been checked!');
                    return false;
                }
                if (_this.options.oneRadio && data.some(i => i.checked == true && i.disabled == true)) {
                    console.warn('You must uncheck the disabled item that have been checked!');
                    return false;
                }
                if (item.checked == true) {
                    item.checked = false;
                } else {
                    item.checked = true;
                }
                _this.eachRadio(item, _this.options.linkage);
                _this.options.getCheckeds && _this.options.getCheckeds.call(_this, item, _this.checkeds);
            }
            'clickCheck' in _this.handlers ? _this.emit('clickCheck', item, _this.checkeds) : null;
        }
    }
    siblingsCollapse(data, item) {
        if (this.options.toggle) {
            let siblings = data.filter(i => i.pId == item.pId && i.children && i != item);
            for (let i = 0, len = siblings.length; i < len; i++) {
                let k = siblings[i];
                if (!k.dom.nextElementSibling) {
                    continue;
                } else {
                    k.expand = true;
                    this.ulToggle(k);
                }
            }
        }
    }
    renderFinish(item, data) {
        let _this = this,
            itemDom = item.dom,
            itemLi = itemDom.parentElement,
            arrowDom = itemDom.querySelector('.ax-arrow'),
            nameDom = itemDom.querySelector('.ax-name');
        if (!arrowDom.classList.contains(this.options.arrowIcon[2])) {
            arrowDom.onclick = function () {
                if (!item.expand && _this.options.async == 'sql') {
                    let ul = itemDom.nextElementSibling;
                    if (!ul) {
                        ul = axAddElem('ul');
                        itemDom.insertAdjacentElement("afterEnd", ul);
                    }
                    if (!ul.querySelector('li')) {
                        axAjax({
                            data: { pId: item.id },
                            type:_this.options.ajaxType,
                            url: _this.options.data,
                            before: function () {
                                arrowDom.setAttribute('loading', '');
                            },
                            success: function (content) {
                                arrowDom.removeAttribute('loading');
                                ul.innerHTML = '';
                                content.forEach(i => {
                                    _this.add(item, i, 'child', 'end');
                                });
                            }
                        });
                    }
                }
                _this.ulToggle(item);
            }
        }
        if (this.selected.includes(item.id)) {
            item.selected = true;
            this.eachSelect(item);
        }
        if (this.options.checkShow) {
            if (this.disabled.includes(item.id)) {
                item.disabled = true;
                this.eachDisabled(item);
            }
            if (this.checked.includes(item.id)) {
                item.checked = true;
                if (this.options.checkType == 'checkbox') {
                    this.eachCheckbox(item, this.options.linkage);
                } else if (this.options.checkType == 'radio') {
                    this.eachRadio(item, this.options.linkage);
                }
            }
            this.clickCheck(item, data);
        }
        let toolsDom, addDom, editDom, removeDom;
        if (this.options.toolsShow) {
            toolsDom = item.dom.querySelector('.ax-tools');
            addDom = toolsDom.querySelector('[add]');
            editDom = toolsDom.querySelector('[edit]');
            removeDom = toolsDom.querySelector('[remove]');
            removeDom.onclick = function () {
                if (item.readonly) {
                    return false;
                }
                let flag = _this.options.removeBefore.call(_this, item, removeDom);
                if (flag == true) {
                    _this.remove(item);
                }
            }
            editDom.onclick = function () {
                if (item.readonly) {
                    return false;
                }
                _this.edit(item);
            }
            addDom.onclick = function () {
                if (item.readonly) {
                    return false;
                }
                _this.add(item);
            }
        }
        if (nameDom) {
            nameDom.onclick = function () {
                if (itemDom.hasAttribute('editing')) {
                    return false;
                }
                let branches = data.filter(i => i != item);
                if (item.selected == true) {
                    item.selected = false;
                    _this.eachSelect(item);
                } else {
                    item.selected = true;
                    _this.eachSelect(item);
                    if (_this.options.oneSelected) {
                        branches.forEach(i => {
                            if (i.selected == true) {
                                i.selected = false;
                                _this.eachSelect(i);
                            }
                        });
                    }
                    'selected' in _this.handlers ? _this.emit('selected', item) : null;
                }
                if (toolsDom && _this.options.toolsAction == 'click') {
                    if (item.selected) {
                        toolsDom.style.display = 'inline-block';
                    } else {
                        toolsDom.style.display = 'none';
                    }
                }
            }
            nameDom.ondblclick = function () {
                if (item.readonly) {
                    return false;
                }
                _this.edit(item);
            }
        }
        /*拖拽节点*/
        if (this.options.draggable == true) {
            itemLi.setAttribute('draggable', 'true');
            itemLi.addEventListener('dragstart', function (e) {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData("id", item.id);
            }, false);
        } else if (axType(this.options.draggable) == 'Array') {
            if (this.options.draggable.includes(item.id)) {
                itemLi.setAttribute('draggable', 'true');
                itemLi.addEventListener('dragstart', function (e) {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData("id", item.id);
                }, false)
            }
        }
        itemDom.addEventListener('dragenter', function (e) {
            e.preventDefault();
        }, false);
        itemDom.addEventListener('dragover', function (e) {
            e.preventDefault();
            itemLi.classList.add('ax-dragging');
            itemLi.setAttribute('insert', _this.dragPlace(e, itemDom));
        }, false);
        itemDom.addEventListener('dragleave', function (e) {
            e.preventDefault();
            itemLi.classList.remove('ax-dragging');
            itemLi.removeAttribute('insert');
        }, false);
        itemDom.addEventListener('drop', function (e) {
            e.preventDefault();
            let data = e.dataTransfer.getData('id'),
                tranItem = _this.flatData.filter(i => data == i.id.toString())[0],
                tranParent = _this.flatData.filter(i => tranItem.pId == i.id)[0],
                moveDirection;
            if (item.pId == tranItem.pId && item.pId == _this.options.firstFloor && _this.dragPlace(e, itemDom) != 'child') {
                moveDirection = '0-0'
            } else if (item.pId == _this.options.firstFloor && _this.dragPlace(e, itemDom) != 'child') {
                moveDirection = '1-0'
            } else if (tranItem.pId == _this.options.firstFloor) {
                moveDirection = '0-1'
            } else {
                moveDirection = 'other';
            }
            itemLi.classList.remove('ax-dragging');
            itemLi.removeAttribute('insert');
            if (item == tranItem) {
                return false;
            }
            _this.dropItem(item, tranItem, tranParent, _this.dragPlace(e, itemDom), moveDirection);
        }, false);
    }
    getParents(idArr, mode = 'obj') {
        let parentsId = [],
            parentsObj = [];
        if (axType(idArr) == 'Array') {
            let items = this.flatData.filter(i => idArr.includes(i.id));
            items.forEach(i => {
                let paths = i.path.split('-').filter(k => k.id != this.options.firstFloor && k != i.id);
                parentsId.push(...paths);
            });
        } else if (axType(idArr) == 'Object') {
            let paths = idArr.path.split('-').filter(k => k.id != this.options.firstFloor && k != idArr.id);
            parentsId.push(...paths);
        } else {
            let item = this.flatData.filter(i => i.id == idArr)[0],
                paths = item.path.split('-').filter(k => k.id != this.options.firstFloor && k != item.id);
            parentsId.push(...paths);
        }
        parentsId = [...parentsId].filter((i, index) => [...parentsId].indexOf(i) == index);
        parentsId = parentsId.map(Number);
        parentsObj = this.flatData.filter(i => parentsId.includes(i.id));
        if (mode == 'obj') {
            return parentsObj;
        } else if (mode == 'id') {
            return parentsId;
        } else {
            return { obj: parentsObj, id: parentsId }
        }
    }
    getChildren(idArr) {
        let childrenObj = [];
        if (axType(idArr) == 'Array') {
            idArr.forEach(i => {
                let children = this.flatData.filter(k => k.path.includes('-' + i + '-'));
                childrenObj.push(...children);
            });
        } else if (axType(idArr) == 'Object') {
            childrenObj = this.flatData.filter(k => k.path.includes('-' + idArr.id + '-'));
        } else {
            childrenObj = this.flatData.filter(k => k.path.includes('-' + idArr + '-'));
        }
        return childrenObj;
    }
    eachSelect(item) {
        if (item.selected == true) {
            item.dom.setAttribute('selected', 'true');
            !this.selecteds.includes(item.id) ? this.selecteds.push(item.id) : null;
        } else {
            item.dom.removeAttribute('selected');
            for (let i = 0; i < this.selecteds.length; i++) {
                if (this.selecteds[i] == item.id) {
                    this.selecteds.splice(i, 1);
                    break;
                }
            }
        }
    }
    eachDisabled(item) {
        let flagToggle = (k, flag) => {
            if (flag) {
                k.dom.setAttribute('disabled', 'true');
                !this.disableds.includes(k.id) ? this.disableds.push(k.id) : null;
            } else {
                k.dom.removeAttribute('disabled');
                for (let i = 0; i < this.disableds.length; i++) {
                    if (this.disableds[i] == k.id) {
                        this.disableds.splice(i, 1);
                        break;
                    }
                }
            }
        }
        let childChecked = (k, flag) => {
            k.disabled = flag;
            flagToggle(k, flag);
            if (k.children && k.children.length > 0) {
                let children = [...k.children].filter(i => !i.disabled);
                children.forEach(i => {
                    childChecked(i, flag);
                });
            }
        }
        if (item.disabled == true) {
            flagToggle(item, true);
            if (this.options.checkType == 'checkbox') {
                childChecked(item, true);
            }
        } else {
            flagToggle(item, false);
            if (this.options.checkType == 'checkbox') {
                childChecked(item, false);
            }
        }
    }
    eachExapand(item) {
        if (item.expand == true) {
            item.dom.setAttribute('expand', 'true');
            !this.expands.includes(item.id) ? this.expands.push(item.id) : null;
        } else {
            item.dom.removeAttribute('expand');
            for (let i = 0; i < this.expands.length; i++) {
                if (this.expands[i] == item.id) {
                    this.expands.splice(i, 1);
                    break;
                }
            }
        }
    }
    checkToggle(obj, flag, type) {
        let itemDom = obj.dom,
            checkDom = itemDom.querySelector('.ax-check'),
            icon = type == 'checkbox' ? 'checkboxIcon' : type == 'radio' ? 'radioIcon' : '';
        if (flag == true) {
            obj.checked = true;
            itemDom.setAttribute('checked', 'true');
            checkDom.classList.remove(this.options[icon][0], this.options[icon][1]);
            checkDom.classList.add(this.options[icon][2]);
        } else if (flag == false) {
            obj.checked = false;
            itemDom.setAttribute('checked', 'false');
            checkDom.classList.remove(this.options[icon][1], this.options[icon][2]);
            checkDom.classList.add(this.options[icon][0]);
        } else if (flag == 'ing') {
            obj.checked = 'ing';
            itemDom.setAttribute('checked', 'ing');
            checkDom.classList.remove(this.options[icon][0], this.options[icon][2]);
            checkDom.classList.add(this.options[icon][1]);
        }
    }
    eachCheckbox(item, linkage) {
        let _this = this;
        if (linkage) {
            let floatDown = (obj) => {
                let isParent = obj.children;
                if (isParent) {
                    if (obj.checked == true) {
                        this.checkToggle(obj, true, 'checkbox');
                        obj.children.forEach(i => {
                            if (!i.disabled) {
                                i.checked = true;
                                floatDown(i);
                            }
                        })
                    } else if (!obj.checked) {
                        this.checkToggle(obj, false, 'checkbox');
                        obj.children.forEach(i => {
                            if (!i.disabled) {
                                i.checked = false;
                                floatDown(i);
                            }
                        })
                    }
                } else {
                    if (obj.checked == true) {
                        this.checkToggle(obj, true, 'checkbox');
                    } else if (!obj.checked) {
                        this.checkToggle(obj, false, 'checkbox');
                    }
                }
            },
                floatUp = (obj) => {
                    let parentArr = obj.path.split('-').filter(i => i != 0 && i != obj.id),
                        parents = this.flatData.filter(i => parentArr.includes(i.id.toString())).reverse();
                    parents.forEach(i => {
                        if (i.children.filter(k => !k.disabled).every(k => !k.checked)) {
                            this.checkToggle(i, false, 'checkbox');
                        } else if (i.children.filter(k => !k.disabled).every(k => k.checked == true)) {
                            this.checkToggle(i, true, 'checkbox');
                        } else if (i.children.some(k => k.checked == true || k.checked == 'ing')) {
                            this.checkToggle(i, 'ing', 'checkbox');
                        }
                    });
                };
            floatDown(item);
            floatUp(item);
        } else {
            if (item.checked == true) {
                this.checkToggle(item, true, 'checkbox');
            } else if (!item.checked) {
                this.checkToggle(item, false, 'checkbox');
            } else {
                this.checkToggle(item, 'ing', 'checkbox');
            }
        }
        this.checkeds = [];
        let checkedItems = this.flatData.filter(i => i.checked == true);
        checkedItems.forEach(i => {
            this.checkeds.push(i.id);
        });
        if (this.checkeds.length > this.options.checkMax) {
            console.warn('The length of checked is too much!');
            'tooMuch' in this.handlers ? this.emit('tooMuch', this.checkeds.length, this.options.checkMax) : null;
        } else if (this.checkeds.length < this.options.checkMin) {
            console.warn('The length of checked is too little!');
            'tooLittle' in this.handlers ? this.emit('tooLittle', this.checkeds.length, this.options.checkMin) : null;
        }
    }
    eachRadio(item, linkage) {
        if (item.checked == true) {
            let hasRadio = [];
            if (this.options.oneRadio) {
                hasRadio = this.flatData.filter(i => i.checked == true && i != item);
            } else {
                hasRadio = this.flatData.filter(i => i.pId == item.pId && i.checked == true && i != item);
            };
            hasRadio.forEach(i => {
                this.checkToggle(i, false, 'radio');
            });
            this.checkToggle(item, true, 'radio');
        } else {
            this.checkToggle(item, false, 'radio');
        }
        if (linkage) {
            let traverse = () => {
                let checkeds = this.flatData.filter(i => i.checked == true),
                    parentArr = [];
                checkeds.forEach(i => {
                    let paths = i.path.split('-').filter(k => k != 0 && k != i.id);
                    parentArr.push(...paths);
                });
                parentArr = [...parentArr].filter(function (i, index) {
                    return [...parentArr].indexOf(i) == index;
                });
                let ingParents = this.flatData.filter(i => parentArr.includes(i.id.toString())),
                    allParents = this.flatData.filter(i => i.children && i != item && !i.checked);
                allParents.forEach(i => {
                    if (i.checked) {
                        this.checkToggle(i, false, 'radio');
                    }
                });
                if (!axIsEmpty(ingParents)) {
                    ingParents.forEach(i => {
                        if (i.checked == true) {
                            this.checkToggle(i, true, 'radio');
                        } else {
                            this.checkToggle(i, 'ing', 'radio');
                        }
                    });
                }
            };
            traverse();
        }
        this.checkeds = [];
        let checkedItems = this.flatData.filter(i => i.checked == true);
        checkedItems.forEach(i => {
            this.checkeds.push(i.id);
        });
    }
    arrange(data) {
        let newArr = [];
        data.forEach((item, index) => {
            let rest = data.slice(index + 1, data.length);
            rest.forEach(i => {
                let itemArr = [];
                itemArr = [item, i];
                newArr.push(itemArr);
            })
        });
        return newArr;
    }
    fixChecked(data) {
        let flag = true;
        if (this.options.checked.length > this.checkMax) {
            console.warn('The length of checked has been automatically intercepted!');
            'tooMuch' in this.handlers ? this.emit('tooMuch', this.options.checked.length, this.checkMax) : null;
            this.checked = this.options.checked.splice(this.checkMax)
        } else {
            this.checked = this.options.checked;
        }
        if (this.checked.length < this.checkMin) {
            console.error('The length of checked has exceeded the limit!');
            'tooLittle' in this.handlers ? this.emit('tooLittle', this.checked.length, this.checkMin) : null;
            flag = false;
        }
        if (this.options.checkType == 'radio' && this.checked.length > 1) {
            flag = !this.arrange(this.checked).some(item => {
                return data.find(i => i.id == item[0]).pId == data.find(i => i.id == item[1]).pId
            });
            if (!flag) {
                console.error('Only one item can be selected at the same level!');
            }
        } else if (this.options.checkType == 'checkbox') {
        }
        return flag;
    }
    fixExpand(data) {
        let newArr = []
        data.forEach(item => {
            let arr = item.path.split('-').filter(i => i != 0);
            if (this.options.expand.includes(~~arr[arr.length - 1])) {
                newArr.push(...arr);
            }
            if (item.children && item.children.length > 0) {
                let childObj = [];
                item.children.forEach(i => {
                    childObj.push(i.id);
                });
                if (this.options.linkage) {
                    if (childObj.every(k => this.checked.includes(k))) {
                        item.checked = true;
                    } else if (childObj.some(k => this.checked.includes(k))) {
                        item.checked = 'ing';
                    }
                }
            }
        });
        this.expand = newArr.filter(function (item, index) {
            return newArr.indexOf(item) == index;
        });
        this.expand.forEach(item => {
            let find = data.find(i => item == i.id && i.children);
            find ? find.expand = true : null;
        });
    }
    createItem(obj, floor) {
        let _this = this,
            check = '',
            tools = `<span class="ax-tools"><i class="ax-iconfont ax-icon-plus" add></i><i class="ax-iconfont ax-icon-edit" edit></i><i class="ax-iconfont ax-icon-trash" remove></i></span>`;
        if (_this.options.checkType == 'checkbox' && _this.options.checkShow) {
            if (obj.hasOwnProperty('checked')) {
                if (obj.checked == true) {
                    check = _this.checkIcon.checkbox[2];
                } else if (obj.checked == 'ing') {
                    check = _this.checkIcon.checkbox[1];
                }
            } else {
                check = _this.checkIcon.checkbox[0];
            }
        } else if (_this.options.checkType == 'radio' && _this.options.checkShow) {
            if (obj.hasOwnProperty('checked')) {
                if (obj.checked == true) {
                    check = _this.checkIcon.radio[2];
                } else if (obj.checked == 'ing') {
                    check = _this.checkIcon.radio[1];
                }
            } else {
                check = _this.checkIcon.radio[0];
            }
        }
        let arrow = `<i class="ax-arrow ${!_this.arrowSame ? 'ax-different' : ''} ax-iconfont ${obj.children ? this.options.arrowIcon[0] : this.options.arrowIcon[2]}"></i>`,
            nodeTpl = `
                        <div class="ax-node" >
                            <span class="ax-indent">${'<i></i>'.repeat(floor - 1)}</span>
                            ${arrow}
                            ${check}
                            <# if(this.children){ #>${_this.fileIcon ? _this.fileIcon.parent : ''}<# } else { #>${_this.fileIcon ? _this.fileIcon.child : ''} <# } #>
                            <a class="ax-name"><# this.name #></a>
                            ${_this.options.toolsShow ? tools : ''}
                        </div>`,
            itemDom = axStrToDom(axTplEngine(nodeTpl, obj));
        if (!axIsEmpty(this.options.addTools)) {
            this.options.addTools.forEach(i => {
                let toosDom = axStrToDom(i.dom);
                toosDom.onclick = function () {
                    i.callback.call(_this, obj);
                }
                itemDom.querySelector('.ax-tools').insertAdjacentElement('afterBegin', toosDom);
            })
        }
        obj.dom = itemDom;
        return itemDom;
    }
    addAttritue(obj, div) {
        div.setAttribute('mark', obj.id);
        if (this.options.readonly.includes(obj.id)) {
            this.readonly(obj);
        }
        this.eachExapand(obj);
        this.options.toolsShow ? div.setAttribute('tools', this.options.toolsAction) : null;
    }
    flatTree(data) {
        let flatArr = [],
            newData = [...data];
        newData.forEach((item) => {
            if (item.children) {
                flatArr = [...flatArr, item, ...this.flatTree(item.children)];
            } else {
                flatArr.push(item);
            }
        });
        this.flatData = [...flatArr];
        return this.flatData;
    }
    refreshTree(data) {
        let each = (data, floor, path = this.options.firstFloor) => {
            data.forEach(item => {
                item.floor = floor;
                item.pId = item.pId ? item.pId : this.options.firstFloor;
                if (floor > this.maxFloor) {
                    this.maxFloor = floor
                }
                if (item.children && item.children.length > 0) {
                    let childPath;
                    item.children.forEach(k => {
                        k.path = '';
                        k.path += path.toString() + '-' + item.id.toString();
                        childPath = k.path;
                        k.pId = item.id;
                    })
                    each(item.children, floor + 1, childPath)
                }
                if (item.path) {
                    item.path += '-' + item.id;
                } else {
                    item.path = item.pId + '-' + item.id;
                }
            });
        }
        each(data, 1);
        this.flatTree(data);
        return data;
    }
    arrayToDom(data) {
        let _this = this,
            outer = axAddElem('ul'),
            fragment = document.createDocumentFragment();
        let plantTree = (parent, data) => {
            let ul = axAddElem('ul');
            data.forEach(item => {
                let div = this.createItem(item, item.floor),
                    li = axAddElem('li');
                this.addAttritue(item, div);
                li.appendChild(div);
                if (item.hasOwnProperty('children')) {
                    plantTree(li, item.children);
                }
                ul.appendChild(li);
            });
            parent.appendChild(ul);
            return parent;
        }
        plantTree(outer, data);
        let list = outer.childNodes[0].childNodes;
        [...list].forEach(item => {
            fragment.appendChild(item);
        });
        this.targetDom.appendChild(fragment);
        let expandDivs = this.targetDom.querySelectorAll('[expand]');
        [...expandDivs].forEach(item => {
            item.nextElementSibling.style.display = 'block';
        });
        'planted' in _this.handlers ? _this.emit('planted', '') : null;
    }
    add(itemObj, newItem, type = 'child', placement = 'front', callback) {
        let _this = this,
            item = typeof itemObj == 'object' ? itemObj : this.flatData.filter(i => i.id == itemObj)[0],
            itemDom = item.dom,
            obj = {};
        if (!axIsEmpty(newItem) && typeof newItem == 'object') {
            let other = type == 'child' ? {
                path: item.path + '-' + newItem.id,
                floor: item.floor + 1
            } : {
                path: item.path.replace(new RegExp('(.*)' + item.id), '$1' + newItem.id),
                floor: item.floor
            };
            obj = Object.assign(newItem, other);
        } else {
            let newId = this.newItemStart(this.flatData),
                newName = '新节点' + newId;
            obj = type == 'child' ? {
                id: newId,
                name: newName,
                pId: item.id,
                path: item.path + '-' + newId,
                floor: item.floor + 1
            } : {
                id: newId,
                name: newName,
                pId: item.pId,
                path: item.path.replace(new RegExp('(.*)' + item.id), '$1' + newId),
                floor: item.floor
            };
        }
        obj.dom = this.createItem(obj, obj.floor);
        let objDom = obj.dom,
            li = axAddElem('li');
        this.addAttritue(obj, objDom);
        li.appendChild(objDom);
        if (type == 'child') {
            if (item.children) {
                placement == 'front' ? item.children.unshift(obj) : item.children.push(obj);
                let ul = itemDom.nextElementSibling;
                ul.insertAdjacentElement(placement == 'front' ? "afterBegin" : "beforeEnd", li);
                this.flatData.push(obj);
                if (!item.expand) {
                    this.ulToggle(item);
                }
            } else {
                item.children = [];
                placement == 'front' ? item.children.unshift(obj) : item.children.push(obj);
                let arrow = itemDom.querySelector('.ax-arrow'),
                    ul = axAddElem('ul', { style: 'display:block' });
                arrow.classList.remove(this.options.arrowIcon[2]);
                arrow.classList.add(this.options.arrowIcon[0]);
                item.expand = true;
                itemDom.setAttribute('expand', 'true');
                ul.insertAdjacentElement(placement == 'front' ? "afterBegin" : "beforeEnd", li);
                itemDom.insertAdjacentElement("afterEnd", ul);
                this.flatData.push(obj);
                this.siblingsCollapse(this.flatData, item);
                arrow.onclick = function () {
                    _this.ulToggle(item);
                }
            }
        } else if (type == 'brother') {
            let parent = this.flatData.filter(i => i.id == item.pId)[0],
                children = parent ? parent.children : this.treeData,
                index = children.indexOf(item);
            if (placement == 'front') {
                index == 0 ? children.unshift(obj) : children.splice(index, 0, obj);
            } else {
                children.splice(index + 1, 0, obj);
            }
            itemDom.parentElement.insertAdjacentElement(placement == 'front' ? "beforeBegin" : "afterEnd", li);
            this.flatData.push(obj);
            if (parent && !parent.expand) {
                parent.expand = true;
                this.ulToggle(parent);
            }
        } else {
            console.error('Node type must be filled correctly!');
            return false;
        }
        this.renderFinish(obj, this.flatData);
        objDom.setAttribute('tabindex', '-1');
        objDom.focus();
        objDom.onblur = function () {
            objDom.removeAttribute('tabindex');
        }
        'added' in _this.handlers ? _this.emit('added', item, obj) : null;
        callback && callback.call(this, item, obj);
        return this;
    }
    edit(itemObj, callback) {
        let _this = this,
            item = typeof itemObj == 'object' ? itemObj : this.flatData.filter(i => i.id == itemObj)[0],
            itemDom = item.dom,
            nameDom = itemDom.querySelector('.ax-name'),
            editInput = axAddElem('input', { type: 'text' });
        if (itemDom.hasAttribute('editing')) {
            return false;
        }
        itemDom.setAttribute('editing', 'true');
        nameDom.innerHTML = '';
        nameDom.appendChild(editInput);
        editInput.focus();
        editInput.value = item.name;
        editInput.onblur = function () {
            itemDom.removeAttribute('editing');
            item.name = this.value;
            nameDom.innerHTML = this.value;
        }
        editInput.onkeyup = function (e) {
            if (e.keyCode == 13) {
                this.blur();
            }
        }
        'edited' in _this.handlers ? _this.emit('edited', item) : null;
        callback && callback.call(this, item);
        return this;
    }
    remove(itemObj, callback) {
        let _this = this,
            item = typeof itemObj == 'object' ? itemObj : this.flatData.filter(i => i.id == itemObj)[0],
            itemLi = item.dom.parentElement;
        itemLi.remove();
        if (item.pId && item.pId != this.options.firstFloor) {
            let parent = this.flatData.filter(i => i.id == item.pId)[0],
                children = parent.children,
                index = children.indexOf(item);
            children.splice(index, 1);
        } else {
            this.treeData = this.treeData.filter(i => i != item);
        }
        this.flatData = this.flatData.filter(i => i != item && !i.path.includes('-' + item.id + '-'));
        'removed' in _this.handlers ? _this.emit('removed', item) : null;
        callback && callback.call(this, item);
        return this;
    }
    search(value, callback) {
        let _this = this;
        if (this.searchs.length > 0) {
            this.searchs.forEach(i => {
                i.dom.querySelector('.ax-name').innerHTML = i.name;
            });
            let other = this.treeData.filter(i => i.dom.parentElement.style.display == 'none');
            other.forEach(i => {
                i.dom.parentElement.removeAttribute('style');
            });
        }
        if (!value) {
            this.searchs = [];
            this.flatData.forEach(i => {
                let k = i.dom.parentElement;
                if (k.style.display == 'none') {
                    k.removeAttribute('style');
                }
            });
        } else {
            let ids = [];
            this.searchs = this.flatData.filter(i => i.name.includes(value)); console.log(this.searchs)
            this.searchs.forEach(i => {
                ids.push(i.id);
                let name = i.dom.querySelector('.ax-name'),
                    text = name.innerHTML.replace(value, '<i>' + value + '</i>');
                name.innerHTML = text;
            }); console.log(ids)
            let parents = this.getParents(ids, 'both');
            parents.obj.forEach(i => {
                i.expand = true;
                i.dom.setAttribute('expand', 'true');
                i.dom.nextElementSibling.style.display = 'block';
            });
            let otherParents = [];
            parents.obj.forEach(i => {
                let brother = this.flatData.filter(k => k.pId = i.pId && k != i);
                otherParents.push(...brother);
            });
            parents.id = [...parents.id, ...ids];
            let firstParents = this.treeData.filter(i => !parents.id.includes(i.id));
            otherParents.push(...firstParents);
            let showItems = this.flatData.filter(i => !otherParents.includes(i));
            showItems.forEach(i => {
                i.dom.parentElement.removeAttribute('style');
            });
            for (let i = 0, len = otherParents.length; i < len; i++) {
                let k = otherParents[i];
                if (k.dom.parentElement.style.display == 'none') {
                    continue;
                } else {
                    k.dom.parentElement.style.display = 'none';
                }
            }
        }
        'searched' in _this.handlers ? _this.emit('searched', this.searchs, value) : null;
        callback && callback.call(this, this.searchs, value);
        return this;
    }
    check(idArr, flag = true) {
        let _this = this,
            items;
        if (axType(idArr) == 'Array') {
            items = this.flatData.filter(i => idArr.includes(i.id));
            for (let i = 0, len = items.length; i < len; i++) {
                let item = items[i];
                if (item.checked == flag) {
                    continue;
                } else {
                    item.checked = flag;
                    if (this.options.checkType == 'checkbox') {
                        this.eachCheckbox(item, this.options.linkage);
                    } else if (this.options.checkType == 'radio') {
                        this.eachRadio(item, this.options.linkage);
                    }
                }
            }
        } else {
            items = this.flatData.filter(i => i.id == idArr);
            if (items.checked == flag) {
                return false;
            } else {
                items[0].checked = flag;
                if (this.options.checkType == 'checkbox') {
                    this.eachCheckbox(items[0], this.options.linkage);
                } else if (this.options.checkType == 'radio') {
                    this.eachRadio(items[0], this.options.linkage);
                }
            }
        }
        'setChecked' in _this.handlers ? _this.emit('setChecked', items) : null;
        return this;
    }
    disable(idArr, flag = true) {
        let _this = this,
            items;
        if (axType(idArr) == 'Array') {
            items = this.flatData.filter(i => idArr.includes(i.id));
            let children = [];
            items.forEach(i => {
                children.push(...this.getChildren(i));
            });
            children = [...children].filter((i, index) => [...children].indexOf(i) == index);
            items.push(...children);
            for (let i = 0, len = items.length; i < len; i++) {
                let item = items[i];
                if (item.disabled == flag) {
                    continue;
                } else {
                    item.disabled = flag;
                    this.eachDisabled(item);
                    children.forEach(k => {
                        k.disabled = flag;
                        this.eachDisabled(k);
                    });
                }
            }
        } else {
            if (items.disabled == flag) {
                return false;
            } else {
                items = this.flatData.filter(i => i.id == idArr);
                this.getChildren(items[0]).forEach(i => {
                    i.disabled = flag;
                    this.eachDisabled(i);
                });
            }
        }
        items.forEach(i => {
            i.disabled = flag;
            this.clickCheck(i, this.flatData);
        });
        'setDisabled' in _this.handlers ? _this.emit('setDisabled', items) : null;
        return this;
    }
    readonly(idArr, flag = true) {
        let _this = this,
            fun = (item, flag) => {
                if (flag) {
                    item.readonly = true;
                    item.dom.setAttribute('readonly', 'true');
                } else {
                    item.readonly = false;
                    item.dom.removeAttribute('readonly');
                }
            },
            items = [];
        if (axType(idArr) == 'Array') {
            items = this.flatData.filter(i => idArr.includes(i.id));
            items.forEach(i => {
                fun(i, flag);
            })
        } else if (axType(idArr) == 'Object') {
            fun(idArr, flag);
            items.push(idArr);
        } else {
            let item = this.flatData.filter(i => i.id == idArr)[0];
            fun(item, flag);
            items.push(item);
        }
        this.readonlys = [...this.readonlys, ...items];
        this.readonlys = [...this.readonlys].filter((i, index) => [...this.readonlys].indexOf(i) == index);
        'setReadonly' in _this.handlers ? _this.emit('setReadonly', items) : null;
        return this;
    }
    expandAll() {
        let expands = this.flatData.filter(i => !i.expand && i.children),
            ids = [];
        expands.forEach(i => {
            i.expand = false;
            this.ulToggle(i, false);
            ids.push(i.id);
        });
        this.expands = ids;
        return this;
    }
    collapseAll() {
        let collapses = this.flatData.filter(i => i.expand && i.children);
        collapses.forEach(i => {
            i.expand = true;
            this.ulToggle(i, false);
        });
        this.expands = [];
        return this;
    }
    reset() {
        let _this = this;
        this.targetDom.innerHTML = '';
        this.init();
        'reset' in _this.handlers ? _this.emit('reset', '') : null;
        return this;
    }
    on(type, handler) {
        axAddPlan(type, handler, this);
        return this;
    }
    emit(type, ...params) {
        axExePlan(type, this, ...params);
    }
    off(type, handler) {
        axDelPlan(type, handler, this);
        return this;
    }
}
(() => {
    document.querySelectorAll('[axTree]').forEach(element => {
        new axTree(element, { data: element });
    });
})();
