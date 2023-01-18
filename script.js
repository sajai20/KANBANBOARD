'use strict';


//api part
class kanbanAPI {
    static getItems(columnId) {
        const column = read().find(column => column.id == columnId);

        if (!column) {
            return []; //we can also return error
        }

        return column.items;
    }

    static insertItem(columnId, content) {
        const data = read();
        const column = data.find(column => column.id == columnId)

        const item = {
            id: Math.floor(Math.random() * 100000),
            content,
        }

        if (!column)
            throw new Error("column doesn't existtt");

        column.items.push(item);
        save(data);

        return item;
    }

    static updateItem(itemId, newProps) {
        const data = read();
        const [item, currentColumn] = (() => {
            for (const column of data) {
                const item = column.items.find(item => item.id == itemId);
                if (item) {
                    return [item, column]; //return item object and current column
                }
            }
        })();

        if (!item) {
            throw new Error("item not found");
        }

        item.content = newProps.content === undefined ? item.content : newProps.content;

        //update column and position

        if (newProps.columnId !== undefined
            && newProps.position !== undefined) {
            const targetColumn = data.find(column => column.id == newProps.columnId);//gettting targeted column

            if (!targetColumn) {
                throw new Error("target column not found");
            }

            //delete the item from it's current column

            currentColumn.items.splice(currentColumn.items.indexOf(item), 1);

            //adding the item in new column and position

            targetColumn.items.splice(newProps.position, 0, item);


        }
        save(data);
    }

    static deleteItem(itemId) {
        const data = read();

        for (const column of data) {
            const item = column.items.find(item => item.id == itemId);

            if (item) {
                column.items.splice(column.items.indexOf(item), 1);
            }
        }
        save(data);
    }
}

function read() {
    const json = localStorage.getItem("kanban-data");
    if (!json) {
        return [
            {
                id: 1,
                items: []
            },
            {
                id: 2,
                items: []
            },
            {
                id: 3,
                items: []
            },
        ];
    }

    return JSON.parse(json);
}

function save(data) {
    localStorage.setItem("kanban-data", JSON.stringify(data));
}


//view part
//this class going to be the entry point 
class kanban {
    constructor(root) {
        this.root = root;
        kanban.columns().forEach(column => {
            //todo create a instance of column class 

            const columnView = new Column(column.id, column.title);
            this.root.appendChild(columnView.elements.root);
        });
    }

    //returns array of every single column
    static columns() {
        return [
            {
                id: 1,
                title: "Not Started",
            },
            {
                id: 2,
                title: "In Progress",
            },
            {
                id: 3,
                title: "Completed",
            }
        ];
    }
}

//to represent single column
class Column {
    constructor(id, title) {

        const topDropZone = DropZone.createDropZone();
        this.elements = {};
        this.elements.root = Column.createRoot();
        this.elements.title = this.elements.root.querySelector(".kanban_column_title");
        this.elements.items = this.elements.root.querySelector(".kanban_column_items");
        this.elements.addItem = this.elements.root.querySelector(".kanban_add_item");

        this.elements.root.dataset.id = id;
        this.elements.title.textContent = title;

        this.elements.items.appendChild(topDropZone);

        this.elements.addItem.addEventListener("click", () => {
            //todo : add items
            const newItem = kanbanAPI.insertItem(id, "");
            this.renderItem(newItem);

        });

        //to show the elements from storage

        kanbanAPI.getItems(id).forEach(item => {
            this.renderItem(item);
        })


    }

    static createRoot() {
        const range = document.createRange();//this is used to create a html using JS
        range.selectNode(document.body);

        return range.createContextualFragment(`
        <div class="kanban_column">
            <div class="kanban_column_title"></div>
            <div class="kanban_column_items"></div>
            <button class="kanban_add_item" type="button">+ Add</button>
        </div>
        `).children[0];
    }

    renderItem(data) {
        //todo create item instance

        const item = new Item(data.id, data.content);
        this.elements.items.appendChild(item.elements.root);
    }
}

class Item {
    constructor(id, content) {

        const bottomDropZone = DropZone.createDropZone();
        this.elements = {};
        this.elements.root = Item.createRoot();
        this.elements.input = this.elements.root.querySelector(".kanban_item_input");

        this.elements.root.dataset.id = id;
        this.elements.input.textContent = content;
        this.content = content;//later we can review

        this.elements.root.appendChild(bottomDropZone);

        const onBlur = () => {
            const newContent = this.elements.input.textContent.trim();

            if (newContent === this.content) {
                return;
            }
            this.content = newContent;
            kanbanAPI.updateItem(id, { content: this.content });
        }

        this.elements.input.addEventListener('blur', onBlur);
        this.elements.root.addEventListener('dblclick', () => {
            const check = confirm("Are you sure you want to delete this item?");

            if (check) {
                kanbanAPI.deleteItem(id);

                this.elements.input.removeEventListener("blur", onBlur);
                this.elements.root.parentElement.removeChild(this.elements.root);
            }
        });

        //this enables draging option
        this.elements.root.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text/plain", id);
        });

        this.elements.input.addEventListener("drop", e => {
            e.preventDefault();
        });
    }

    static createRoot() {
        const range = document.createRange();//this is used to create a html using JS
        range.selectNode(document.body);

        return range.createContextualFragment(`
        <div class="kanban_item">
        <div contenteditable="" draggable = "true" class="kanban_item_input"></div>
        </div>
        `).children[0];
    }
}


class DropZone {
    static createDropZone() {
        const range = document.createRange();//this is used to create a html using JS
        range.selectNode(document.body);

        const dropZone = range.createContextualFragment(`
        <div class="kanban_dropzone">
        </div>
        `).children[0];

        dropZone.addEventListener("dragover", e => {
            e.preventDefault();
            dropZone.classList.add("kanban_dropzone_active");
        });

        dropZone.addEventListener("dragleave", e => {
            dropZone.classList.remove("kanban_dropzone_active");
        });

        dropZone.addEventListener("drop", e => {
            e.preventDefault();
            dropZone.classList.remove("kanban_dropzone_active");

            const columnElements = dropZone.closest(".kanban_column");
            const columnId = Number(columnElements.dataset.id);

            const dropZoneInColumn = Array.from(columnElements.querySelectorAll(".kanban_dropzone"));
            const droppedIndex = dropZoneInColumn.indexOf(dropZone);

            const itemId = Number(e.dataTransfer.getData("text/plain"));

            const droppedItemElement = document.querySelector(`[data-id="${itemId}"]`);

            const insertAfter = dropZone.parentElement.classList.contains("kanban_item") ? dropZone.parentElement : dropZone;

            insertAfter.after(droppedItemElement);
            kanbanAPI.updateItem(itemId, { columnId, position: droppedIndex });

        });
        return dropZone;
    }
}

// kanbanAPI.insertItem(1, "I'm new !!!");
// kanbanAPI.insertItem(2, "I'm not new !!!");
// console.log(kanbanAPI.getItems(1));

// kanbanAPI.updateItem(19107, { columnId: 1, position: 0, content: "first update" });

// kanbanAPI.deleteItem(19107);


new kanban(document.querySelector(".kanban"));

