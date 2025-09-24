const storeKey='todoTasks_v1'
const themeKey='todoTheme_v1'
let tasks=[]
let currentFilter='all'
let currentPrio='any'

function uid(){return crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.floor(Math.random()*1e6)}
function save(){localStorage.setItem(storeKey,JSON.stringify(tasks))}
function load(){const raw=localStorage.getItem(storeKey);tasks=raw?JSON.parse(raw):[]}
function saveTheme(t){localStorage.setItem(themeKey,t)}
function loadTheme(){return localStorage.getItem(themeKey)||'dark'}

function setTheme(mode){
  document.documentElement.setAttribute('data-theme',mode)
  const btn=$('#themeToggle')
  if(btn.length){
    const icon=btn.find('i')
    btn.toggleClass('btn-outline-light',mode==='dark')
    btn.toggleClass('btn-outline-secondary',mode!=='dark')
    icon.removeClass('bi-sun bi-moon')
    icon.addClass(mode==='dark'?'bi-sun':'bi-moon')
  }
}

function fmtDateTime(s){
  if(!s) return ''
  const d=new Date(s)
  if(isNaN(d)) return ''
  const opts={year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}
  return d.toLocaleString(undefined,opts)
}

function isOverdue(s,done){
  if(!s||done) return false
  const d=new Date(s)
  if(isNaN(d)) return false
  return d.getTime()<Date.now()
}

function getDueStatus(s,done){
  if(!s||done) return ''
  const d=new Date(s)
  if(isNaN(d)) return ''
  const now=Date.now()
  const diff=d.getTime()-now
  if(diff<0) return 'overdue'
  if(diff<=24*60*60*1000) return 'due-soon'
  return ''
}

function render(){
  const list=$('#taskList')
  list.empty()

  const filtered=tasks.filter(t=>{
    const statusOk = currentFilter==='all' ? true : (currentFilter==='active' ? !t.done : t.done)
    const prioOk = currentPrio==='any' ? true : t.priority===currentPrio
    return statusOk && prioOk
  })

  if(filtered.length===0){$('#emptyState').show()}else{$('#emptyState').hide()}

  filtered.forEach(t=>{
    const prioClass=t.priority==='high'?'prio-high':t.priority==='low'?'prio-low':'prio-med'
    const dueState=getDueStatus(t.due,t.done)
    const li=$(`
      <li class="list-group-item justify-content-between ${t.done?'completed':''} ${prioClass} ${dueState}" data-id="${t.id}">
        <div class="form-check d-flex align-items-center gap-2 flex-grow-1">
          <span class="badge-dot"></span>
          <input class="form-check-input toggle" type="checkbox" ${t.done?'checked':''} aria-label="Mark complete">
          <span class="task-text flex-grow-1"></span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge-chip ${prioClass}">${t.priority.charAt(0).toUpperCase()+t.priority.slice(1)}</span>
          ${t.due?`<span class="badge-due ${isOverdue(t.due,t.done)?'overdue':''}">Due: ${fmtDateTime(t.due)}</span>`:''}
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary edit" aria-label="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger delete" aria-label="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </li>`)
    li.find('.task-text').text(t.text)
    list.append(li)
  })

  const remaining=tasks.filter(t=>!t.done).length
  $('#count').text(`${tasks.length} item${tasks.length!==1?'s':''} • ${remaining} active`)
}

function addTask(text,priority,due){
  const trimmed=text.trim()
  if(!trimmed)return
  const pr=(priority==='high'||priority==='low')?priority:'medium'
  let dueVal=''
  if(due){
    const picked=new Date(due)
    if(isNaN(picked)) return
    const now=new Date()
    if(picked.getTime()<now.getTime()){
      alert('Please choose a future date/time.')
      return
    }
    dueVal=picked.toISOString()
  }
  tasks.unshift({id:uid(),text:trimmed,done:false,priority:pr,due:dueVal})
  save()
  render()
}

function startEdit(id){
  const li=$(`li[data-id='${id}']`)
  const span=li.find('.task-text')
  const val=span.text()
  const input=$(`<input type="text" class="form-control form-control-sm edit-input" value="${$('<div>').text(val).html()}" aria-label="Edit task">`)
  span.replaceWith(input)
  input.focus()
  li.data('editing',true)
}

function commitEdit(id,newText){
  const idx=tasks.findIndex(t=>t.id===id)
  if(idx<0)return
  const text=newText.trim()
  if(!text){tasks.splice(idx,1)}else{tasks[idx].text=text}
  save()
  render()
}

$(function(){ // jQuery DOM Ready
  const t=loadTheme()
  setTheme(t)

  $('#dueInput').attr('min', new Date().toISOString().slice(0,16))

  load()
  tasks=tasks.map(x=>({id:x.id,text:x.text,done:!!x.done,priority:x.priority||'medium',due:x.due||''}))
  render()

  $('#addBtn').on('click',function(){
    const txt=$('#taskInput').val()
    const pr=$('#prioritySelect').val()
    const due=$('#dueInput').val()
    addTask(txt,pr,due)
    $('#taskInput').val('').focus()
    $('#prioritySelect').val('medium')
    $('#dueInput').val('')
    $('#dueInput').attr('min', new Date().toISOString().slice(0,16))
  })

  $('#taskInput').on('keydown',function(e){if(e.key==='Enter'){$('#addBtn').click()}})

  $('#filters').on('click','.nav-link',function(){
    $('#filters .nav-link').removeClass('active')
    $(this).addClass('active')
    currentFilter=$(this).data('filter')
    render()
  })

  $('#prioFilter').on('change', function(){
    currentPrio = $(this).val()
    render()
  })

  $('#taskList').on('change','.toggle',function(){
    const id=$(this).closest('li').data('id')
    const t=tasks.find(x=>x.id===id)
    if(!t)return
    t.done=this.checked
    save()
    render()
  })

  $('#taskList').on('click','.delete',function(){
    const id=$(this).closest('li').data('id')
    tasks=tasks.filter(t=>t.id!==id)
    save()
    render()
  })

  $('#taskList').on('click','.edit',function(){
    const id=$(this).closest('li').data('id')
    startEdit(id)
  })

  $('#taskList').on('keydown blur','.edit-input',function(e){
    const id=$(this).closest('li').data-id
    if(e.type==='blur'){commitEdit($(this).closest('li').data('id'),$(this).val())}
    if(e.type==='keydown'&&e.key==='Enter'){commitEdit($(this).closest('li').data('id'),$(this).val())}
    if(e.type==='keydown'&&e.key==='Escape'){render()}
  })

  $('#clearCompleted').on('click',function(){
    tasks=tasks.filter(t=>!t.done)
    save()
    render()
  })

  $('#resetAll').on('click',function(){
    if(confirm('Reset all tasks?')){tasks=[];save();render()}
  })

  $('#themeToggle').on('click',function(){
    const next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'
    setTheme(next)
    saveTheme(next)
  })
})
