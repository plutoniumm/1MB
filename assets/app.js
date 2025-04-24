Array.prototype.move = function ( old_index, new_index ) {
    if ( new_index >= this.length ) {
        new_index = this.length - 1;
    }
    this.splice( new_index, 0, this.splice( old_index, 1 )[ 0 ] );
    return this;
};
Element.prototype.atIndex = function () {
    if ( !this.parentNode ) return -1;

    for ( var i = 0;i < this.parentNode.children.length;i++ ) {
        if ( this.parentNode.children[ i ] == this ) return i;
    };

    return -1;
};

const $id = ( id ) => document.getElementById( id );
const now = () => ( new Date() ).getTime();
const timeISO = ( x ) => ( new Date( x ) ).toISOString();
const copy = ( o ) => JSON.parse( JSON.stringify( o ) );

function live ( eventType, selector, callback ) {
    document.addEventListener( eventType, function ( e ) {
        if ( e.target.matches( selector ) ) {
            callback.call( e.target, e );
        }
    }, false );
};

var ModalDialog = function ( title, body, extra, ok_callback, ok_data, cancel_callback, cancel_data ) {
    $id( 'modal-dialog-title-id' ).innerHTML = title;
    $id( 'modal-dialog-body-id' ).innerHTML = body;
    $id( 'modal-dialog-extra-id' ).innerHTML = '';
    if ( extra ) {
        $id( 'modal-dialog-extra-id' ).appendChild( extra );
    }
    ModalDialog.ok_data = ok_data;
    ModalDialog.ok_callback = ok_callback;
    ModalDialog.cancel_data = cancel_data;
    ModalDialog.cancel_callback = cancel_callback;
    if ( !ok_callback ) {
        $id( 'modal-dialog-ok-id' ).style.display = 'none';
    } else if ( !cancel_callback ) {
        $id( 'modal-dialog-cancel-id' ).style.display = 'none';
        $id( 'modal-dialog-ok-id' ).style.display = 'inline-block';
    } else {
        $id( 'modal-dialog-cancel-id' ).style.display = 'inline-block';
        $id( 'modal-dialog-ok-id' ).style.display = 'inline-block';
    }
    ModalDialog.show();
};

ModalDialog.show = () => $id( 'modal-dialog' ).style.display = 'block';
ModalDialog.hide = () => $id( 'modal-dialog' ).style.display = 'none';

$id( 'modal-dialog-ok-id' ).onclick = function () {
    if ( typeof ModalDialog.ok_callback == 'function' ) {
        ModalDialog.ok_callback( ModalDialog.ok_data );
    };
    ModalDialog.hide();
};

$id( 'modal-dialog-cancel-id' ).onclick = function () {
    if ( typeof ModalDialog.cancel_callback == 'function' ) {
        ModalDialog.cancel_callback( ModalDialog.cancel_data );
    }
    ModalDialog.hide();
};

// function adapterExample (array_value, is_innerhtml)
ModalDialog.Option = function ( title, body, optionlist, adapter, ok_callback ) {
    var selector = document.createElement( 'select' );
    selector.style.width = '100%';
    selector.className = 'option-task';
    selector.id = 'modal-dialog-selector';
    for ( var i = 0;i < optionlist.length;i++ ) {
        var option = document.createElement( 'option' );
        option.selected = ( i == 0 );
        if ( adapter ) {
            option.innerHTML = adapter( optionlist[ i ], true );
            option.value = adapter( optionlist[ i ], false );
        } else {
            option.innerHTML = optionlist[ i ];
            option.value = optionlist[ i ];
        }
        selector.appendChild( option );
    };
    ModalDialog.Option.ok_callback = ok_callback;
    ModalDialog( title, body, selector, function () {
        var selector = $id( 'modal-dialog-selector' );
        if ( ModalDialog.Option.ok_callback ) {
            ModalDialog.Option.ok_callback( selector.value );
        } else {
            alert( 'INVALID CALLBACK' );
        }
    }, null, true, null );
};

ModalDialog.Input = function ( title, body, placeholder, ok_callback ) {
    var input = document.createElement( 'input' );
    input.id = 'modal-dialog-input';
    input.type = 'text';
    input.style.width = '100%';
    input.placeholder = placeholder ? placeholder : '';
    ModalDialog.Input.ok_callback = ok_callback;
    ModalDialog( title, body, input, function () {
        var input = $id( 'modal-dialog-input' );
        if ( ModalDialog.Input.ok_callback ) {
            ModalDialog.Input.ok_callback( input.value );
        } else {
            alert( 'INVALID CALLBACK' );
        }
    }, null, true, null );
};

ModalDialog.Message = function ( title, body ) {
    ModalDialog( title, body, null, true, null, false, null );
};

var AJAX = function ( method, url, callback, body ) {
    this.context = new XMLHttpRequest();
    var self = this.context;
    this.context.onreadystatechange = function () {
        if ( self.readyState == 4 ) {
            if ( self.status == 200 ) {
                if ( callback ) callback( self.responseText );
            } else {
                ModalDialog.Message( 'Error ' + self.status, self.responseText );
            }
        }
    };
    this.context.open( method, url, true );
    this.context.send( body );
};

var Type = function ( data ) {
    this.name = data.name;
    this.color = data.color;
    this.json = function () {
        return {
            name: this.name,
            color: this.color
        };
    };
};

var Task = function ( data, list, index ) {
    this.name = data.name;
    this.deadline = data.deadline;
    this.type = UI.taskType( data.type );
    this.description = data.description;
    this.creationTime = data.creation ? data.creation : now();
    this.removedTime = data.removed ? data.removed : 0;
    this.list = list;
    this.element = document.createElement( "div" );
    this.element.draggable = true;
    this.element.id = '#todo_' + index;
    this.element.className = 'card';
    this.element.self = this;
    this.element.ondblclick = function ( e ) {
        e.preventDefault();
        UI.modalShow( e.target.self );
    };
    this.is_name = ( name ) => ( name == this.name );
    this.moveToList = function ( list ) {
        this.list.remove( this );
        list.add( this );
    };

    this.moveAtTask = ( task ) => this.list.moveAt( this, task );
    this.moveAtEnd = ( task ) => this.list.moveAt( this );

    this.updateUI = function () {
        this.element.innerHTML = "";
        var span = document.createElement( "span" );
        span.style.color = '#666699';
        span.className = 'task-user';
        span.innerHTML = this.name;
        span.ondblclick = function ( e ) {
            e.preventDefault();
            UI.modalShow( e.target.parentNode.self );
        };
        this.element.appendChild( span );
        span = document.createElement( "span" );
        span.ondblclick = function ( e ) {
            e.preventDefault();
            UI.modalShow( e.target.parentNode.self );
        };
        this.element.appendChild( span );
        span = document.createElement( "span" );
        span.style.color = this.type.color;
        span.className = 'task-type';
        span.innerHTML = '&nbsp;' + this.type.name;
        span.ondblclick = function ( e ) {
            e.preventDefault();
            UI.modalShow( e.target.parentNode.self );
        };
        this.element.appendChild( span );
        if ( this.deadline ) {
            this.element.appendChild( document.createElement( "br" ) );
            span = document.createElement( "span" );
            span.style.color = '#909090';
            span.className = 'task-deadline';
            span.innerHTML = 'Deadline: ' + decodeURIComponent( this.deadline );
            span.ondblclick = function ( e ) {
                e.preventDefault();
                UI.modalShow( e.target.parentNode.self );
            };
            this.element.appendChild( span );
        }
        this.element.appendChild( document.createElement( "br" ) );
        span = document.createElement( "span" );
        span.innerHTML = decodeURIComponent( this.description );
        span.ondblclick = function ( e ) {
            e.preventDefault();
            UI.modalShow( e.target.parentNode.self );
        };
        this.element.appendChild( span );
    };
    this.show = () => this.element.style.display = 'block';
    this.hide = () => this.element.style.display = 'none';
    this.json = function () {
        return {
            type: this.type.name,
            name: this.name,
            deadline: this.deadline,
            description: this.description,
            creation: this.creationTime,
            removed: this.removedTime,
        };
    };
};

var List = function ( name, index, tasks ) {
    this.name = name;
    this.tasks = new Array( tasks ? tasks.length : 0 );
    this.element = document.createElement( "div" );
    this.heading = document.createElement( "h3" );
    this.listCounter = document.createElement( "span" );
    this.element.id = '#list_' + index;
    this.element.self = this;
    this.element.className = "list";
    this.heading.className = "listname";
    this.update = function () {
        // contains the header when empty
        this.tasks = [];
        for ( var i = 0;i < this.element.children.length;i++ ) {
            var t = this.element.children[ i ].self;
            if ( t && !t.isplaceholder ) {
                t.list = this;
                this.tasks.push( t );
            }
        }
    };
    this.updateUI = function () {
        this.element.innerHTML = '';
        this.heading.innerHTML = this.name;
        this.listCounter.innerHTML = '' + this.tasks.length;
        this.element.appendChild( this.heading );
        this.heading.appendChild( this.listCounter );
        for ( var i = 0;i < this.tasks.length;i++ ) {
            this.tasks[ i ].updateUI();
            this.element.appendChild( this.tasks[ i ].element );
        }
    };
    this.moveAt = function ( task0, task1 ) {
        var src = this.tasks.indexOf( task0 );
        var dst = task1 ? this.tasks.indexOf( task1 ) : this.tasks.length - 1;
        this.tasks.move( src, dst );
    };
    this.add = function ( task, index ) {
        task.list = this;
        if ( typeof index != 'number' ) {
            task.index = this.tasks.length;
            this.tasks.push( task );
        } else {
            task.index = index;
            this.tasks.splice( index, 0, task );
        }
    };
    this.remove = function ( task ) {
        var index = this.tasks.indexOf( task );
        if ( index > -1 ) {
            task.list = null;
            return this.tasks.splice( index, 1 )[ 0 ];
        }
        return null;
    };
    this.size = () => this.tasks.length;
    this.json = function () {
        var j = {};
        j.name = this.name;
        j.tasks = new Array( this.tasks.length );
        for ( var i = 0;i < this.tasks.length;i++ ) {
            j.tasks[ i ] = this.tasks[ i ].json();
        }
        return j;
    };
    for ( var i = 0;i < this.tasks.length;i++, List.index++ ) {
        var t = tasks[ i ];
        this.tasks[ i ] = new Task( t, this, List.index );
    }
};

List.index = 0;

var Placeholder = function () {
    this.element = document.createElement( 'div' );
    this.element.className = "card-placeholder";
    this.element.self = this;
    this.before = null;
    this.isplaceholder = true;
    this.remove = function ( e ) {
        this.element.remove( e );
    }
    this.height = function ( px ) {
        this.element.style.height = px ? px : '52px';
    }
};

var Kanban = function () {
    this.dragging = false;
    this.network = false;
    this.placeholder = new Placeholder();
    this.lists = [];
    this.types = [];
    this.board = $id( 'board' );
    this.adder = $id( 'frmAddTodo' );
    this.selectorTypes = $id( 'todo_types' );
    this.modalDiv = $id( 'modal-id' );
    this.adder.onsubmit = function ( e ) {
        e.preventDefault();
        var description = encodeURIComponent( this.todo_text.value.trim() );
        var name = this.todo_name.value.trim();
        var type = this.todo_type.value.trim();
        var deadline = encodeURIComponent( this.todo_deadline.value.trim() );
        if ( description == '' || name == '' || type == '' ) {
            return false;
        }
        UI.addTask( name, description, deadline, type );
        UI.updateList();
        UI.updateUI();
        UI.poll();
        this.reset();
        return false;
    };
    this.taskType = function ( name ) {
        for ( var i = 0;i < this.types.length;i++ ) {
            if ( this.types[ i ].name == name ) {
                return this.types[ i ];
            }
        }
        console.log( 'Cannot find: \'' + name + '\'' );
        return null;
    };
    this.addTask = function ( name, description, deadline, type ) {
        var l = this.lists[ 0 ];
        var t = new Task( {
            name: name,
            description: description,
            deadline: deadline,
            type: type,
        }, l, l.size() );
        l.element.appendChild( t.element );
    };
    this.addList = function ( name ) {
        this.lists.push( new List( p.name, data.lists.length, [] ) );
    };
    this.trashTask = function ( task ) {
        task.removedTime = now();
        task.list.remove( task );
    };
    this.update = function ( data ) {
        this.lists = [];
        this.types = [];
        List.index = 0;
        for ( var i = 0;i < data.types.length;i++ ) {
            this.types.push( new Type( data.types[ i ] ) );
        }
        for ( var i = 0;i < data.lists.length;i++ ) {
            var p = data.lists[ i ];
            this.lists.push( new List( p.name, i, p.tasks ) );
        }
        this.network = false;
    };
    this.updateList = function () {
        for ( var i = 0;i < this.lists.length;i++ ) {
            this.lists[ i ].update();
        }
    };
    this.updateUI = function () {
        this.board.innerHTML = '';
        var n = 0;
        for ( var i = 0;i < this.lists.length;i++ ) {
            n += this.lists[ i ].size();
            this.lists[ i ].updateUI();
            this.board.appendChild( this.lists[ i ].element );
        }
        this.selectorTypes.innerHTML = '';
        for ( var i = 0;i < this.types.length;i++ ) {
            var option = document.createElement( 'option' );
            option.style.color = this.types[ i ].color;
            option.innerHTML = this.types[ i ].name;
            option.selected = ( i == 0 );
            option.value = this.types[ i ].name;
            this.selectorTypes.appendChild( option );
        }
        this.adder.style.display = "block";;
    };
    this.poll = () => server_req( JSON.stringify( this.json() ) );
    this.json = function () {
        var d = {
            lists: new Array( this.lists.length ),
            types: new Array( this.types.length ),
        };
        for ( var i = 0;i < this.lists.length;i++ ) {
            d.lists[ i ] = this.lists[ i ].json();
        }
        for ( var i = 0;i < this.types.length;i++ ) {
            d.types[ i ] = this.types[ i ].json();
        }
        return d;
    };
    this.wait = function ( b ) {
        this.network = b ? true : false;
    };
    this.modalShow = function ( task ) {
        if ( task && !this.network ) {
            this.modalDiv.style.display = 'block';
            this.modalDiv.task = task;
            this.modalReload();
        }
    };
    this.modalReload = function () {
        var task = this.modalDiv.task;
        $id( 'modal-name-id' ).innerHTML = task.name;
        $id( 'modal-type-id' ).innerHTML = task.type.name;
        $id( 'modal-deadline-id' ).innerHTML = task.deadline ? decodeURIComponent( task.deadline ) : '---';
        $id( 'modal-type-id' ).style.color = task.type.color;
        $id( 'modal-body-id' ).value = decodeURIComponent( task.description );
        $id( 'modal-body-id' ).disabled = false;
        $id( 'modal-deadline-id' ).ondblclick = function () {
            ModalDialog.Input( "Edit Task Deadline", "Please enter the new deadline", decodeURIComponent( UI.modalDiv.task.deadline ), function ( newdeadline ) {
                UI.modalEditDeadline( newdeadline.trim() );
            } );
        };
        $id( 'modal-type-id' ).ondblclick = function () {
            ModalDialog.Option(
                "Edit Task Type",
                "Please choose a new type to assign the Task",
                UI.types,
                v => v.name,
                ( newtype ) => UI.modalEditType( newtype )
            );
        };
    };
    this.modalEditDeadline = function ( x ) {
        this.modalUpdateDescription();
        if ( !this.network ) {
            this.modalDiv.task.deadline = encodeURIComponent( x );
            this.modalReload();
        }
    };
    this.modalEditName = function ( x ) {
        this.modalUpdateDescription();
        if ( !this.network ) {
            this.modalDiv.task.name = x;
            this.modalReload();
        }
    };
    this.modalEditType = function ( x ) {
        this.modalUpdateDescription();
        if ( !this.network ) {
            this.modalDiv.task.type = UI.taskType( x );
            this.modalReload();
        }
    };
    this.modalUpdateDescription = function () {
        if ( !this.network ) {
            var desc = decodeURIComponent( this.modalDiv.task.description );
            var text = $id( 'modal-body-id' ).value.trim();
            this.modalDiv.task.description = encodeURIComponent( text );
        }
    };
    this.modalHide = function () {
        this.modalUpdateDescription();
        this.modalDiv.style.display = 'none';
        this.modalDiv.task = null;

        this.poll();
    };
};

var UI = new Kanban();

window.addEventListener( "dragover", function ( e ) { e.preventDefault() }, false );
window.addEventListener( "drop", function ( e ) { e.preventDefault() }, false );

live( 'dragstart', '.list .card', function ( e ) {
    UI.dragging = true;
    UI.placeholder.height( e.target.offsetHeight + 'px' );
    e.dataTransfer.setData( 'text', e.target.id );
    e.dataTransfer.dropEffect = "copy";
    e.target.classList.add( 'dragging' );
} );

live( 'dragend', '.list .card', function ( e ) {
    this.classList.remove( 'dragging' );
    UI.placeholder.remove();
    UI.placeholder.height();
    UI.dragging = false;
} );

live( 'dragover', '.list, .list .card, .list .card-placeholder', function ( e ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if ( this.className === "list" ) {
        UI.placeholder.before = null;
        this.appendChild( UI.placeholder.element );
    } else if ( this.className.indexOf( 'card-placeholder' ) !== -1 ) {
        UI.placeholder.before = this.parentNode.children[ this.atIndex() + 1 ];
        this.parentNode.insertBefore( UI.placeholder.element, this );
    } else if ( this.className.indexOf( 'card' ) !== -1 ) {
        this.parentNode.insertBefore( UI.placeholder.element, this );
    }
} );

live( 'drop', '.list, .list .card-placeholder', function ( e ) {
    e.preventDefault();
    if ( !UI.dragging || UI.network ) return false;
    var task_id = e.dataTransfer.getData( 'text' );
    var task = $id( task_id );
    if ( this.className === 'list' ) {
        this.appendChild( task );
    } else {
        this.parentNode.replaceChild( task, this );
    }
    UI.updateList();
    UI.updateUI();
    UI.poll();
} );

live( 'drop', '.bin', function ( e ) {
    e.preventDefault();
    if ( UI.network ) return false;
    var task_id = e.dataTransfer.getData( 'text' );
    var task = $id( task_id );
    UI.trashTask( task.self );
    UI.updateUI();
    UI.poll();
} );

function server_req ( body ) {
    var xhr = new AJAX( body ? "POST" : "GET", "kanban", ( data ) => {
        UI.update( JSON.parse( data ) );
        UI.updateUI();
    }, body );

    UI.wait( true );
}

$id( 'modal-cross-id' ).onclick = () => UI.modalHide();
window.onclick = function ( event ) {
    if ( event.target == UI.modalDiv ) UI.modalHide();
};

document.addEventListener( "DOMContentLoaded", () => server_req( null ) );