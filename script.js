const todoInput = document.querySelector('.todo-input')
const addBtn = document.querySelector('.add-btn')
const alertInfo = document.querySelector('.alert-info')

const settingsBtn = document.querySelector('.settings-btn')
const settingsPanel = document.querySelector('.settings-panel')
const closeBtn = document.querySelector('.close-btn')
const colorBtns = document.querySelectorAll('.color-btn')

const ulList = document.querySelector('.todo-list ul')
let idNumber = 0 // unikalne id dla każdego zadania

const popup = document.querySelector('.popup')
const popupInfo = document.querySelector('.popup-info')
let editedTask
const popupInput = document.querySelector('.popup-input')
const popupAcceptBtn = document.querySelector('.accept-btn')
const popupCancelBtn = document.querySelector('.cancel-btn')

const main = () => {
	// function fires after the entire DOM is loaded, then calls prepareDOMEvents

	prepareDOMEvents()
	if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
		todoInput.focus()
	} // autofocus only on desktop

	loadTasks() // loading tasks from localStorage
}

const prepareDOMEvents = () => {
	// Setting initial value of aria-hidden
	if (!settingsPanel.classList.contains('show')) {
		settingsPanel.setAttribute('aria-hidden', 'true')
	}

	// SETTING PANEL
	//Enabling and disabling the settings panel
	settingsBtn.addEventListener('click', () => {
		settingsPanel.classList.toggle('show')
		if (settingsPanel.classList.contains('show')) {
			settingsPanel.setAttribute('aria-hidden', 'false')
		} else {
			settingsPanel.setAttribute('aria-hidden', 'true')
		}
	})

	// Closing settings panel with X
	closeBtn.addEventListener('click', () => {
		settingsPanel.classList.remove('show')
		settingsPanel.setAttribute('aria-hidden', 'true')
	})

	// CLICKING OUTSIDE THE SETTINGS PANEL AND INPUT
	window.addEventListener('click', e => {
		// SETTINGS PANEL
		if (
			settingsPanel.classList.contains('show') &&
			!e.target.closest('.settings-panel') &&
			!e.target.closest('.settings-btn')
		) {
			settingsPanel.classList.remove('show')
			settingsPanel.setAttribute('aria-hidden', 'true')
		}

		// POPUP
		if (popup.style.display === 'flex' && !e.target.closest('.edit-btn') && !e.target.closest('.popup')) {
			closePopup()
		}

		// Hiding the alert 'Enter task content' when clicking outside the input
		if (
			alertInfo.textContent === 'Enter task content!' &&
			!e.target.closest('.todo-input') &&
			!e.target.closest('.add-btn')
		) {
			const currentTasks = ulList.querySelectorAll('li')

			if (currentTasks.length === 0) {
				alertInfo.textContent = 'No tasks on the list.'
			} else {
				alertInfo.textContent = ''
			}
		}
	})

	// Changing task content if we click Enter
	popupInput.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			changeTask()
		}
	})

	// Closing popup when pressing Esc
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && popup.style.display === 'flex') {
			closePopup()
		}
	})

	//Changing theme color
	colorBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const theme = btn.getAttribute('data-color')
			if (theme) {
				document.documentElement.style.setProperty('--theme-color', `var(${theme})`)
			}

			saveTheme(theme)
		})
	})

	// Updating popup position when the visible area changes (e.g., keyboard appearance on mobile)
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', updatePopupPosition)
		window.visualViewport.addEventListener('scroll', updatePopupPosition)
	}

	// When the popup is open, clicking the pencil icon doesn't steal focus from the input. Otherwise, the mobile keyboard would hide and show again, and the page would jump.
	ulList.addEventListener('mousedown', e => {
		if (popup.style.display === 'flex' && e.target.closest('.edit-btn')) {
			e.preventDefault()
		}
	})

	addBtn.addEventListener('click', addNewTask)
	todoInput.addEventListener('keydown', enterCheck)
	ulList.addEventListener('click', checkClick)
	ulList.addEventListener('change', completedTask)
	ulList.addEventListener('keydown', handleLabelKeydown)
	popupAcceptBtn.addEventListener('click', changeTask)
	popupCancelBtn.addEventListener('click', closePopup)
}

// Function creates a new task element and returns it
const createTaskElement = ({ id, text, completed = false }) => {
	const li = document.createElement('li')
	li.setAttribute('id', id)

	li.innerHTML = `
		<label>
			<input type="checkbox" ${completed ? 'checked' : ''}>
			<span class="custom-checkbox" tabindex="0">
				<i class="fa fa-check"></i>
			</span>
			<span class="todo-text ${completed ? 'completed' : ''}" tabindex="0"></span>
		</label>
		<div class="control-btns">
			<button class="edit-btn shadow" aria-label="Edit task"><i class="fa-solid fa-pencil"></i></button>
			<button class="delete-btn shadow" aria-label="Delete task"><i class="fa-solid fa-trash"></i></button>
		</div>
	`

	li.querySelector('.todo-text').textContent = text

	return li
}

// Function adds a new task to the beginning of the list; shows an alert if the input is empty
const addNewTask = () => {
	if (todoInput.value.trim() !== '') {
		idNumber++

		const newTask = createTaskElement({ id: `task-${idNumber}`, text: todoInput.value.trim() })

		ulList.prepend(newTask)

		todoInput.value = ''
		alertInfo.textContent = ''

		saveTasks()
	} else {
		alertInfo.textContent = 'Enter task content!'
	}

	todoInput.focus()
}

// Calling the addNewTask function (adding a new task) when pressing the Enter key
const enterCheck = e => {
	if (e.key === 'Enter') {
		addNewTask()
	}
}

// Function handling clicks on edit and delete buttons
const checkClick = e => {
	const clickedEl = e.target.closest('button')
	if (!clickedEl) return

	if (clickedEl.classList.contains('edit-btn')) {
		editTask(e)
	} else if (clickedEl.classList.contains('delete-btn')) {
		deleteTask(e)
	}
}

// Function handling the edit popup for a task whose .edit-btn was clicked
const editTask = e => {
	const clickedTask = e.target.closest('li')

	// the edit btn was clicked in a task that we are already editing → close the popup
	if (popup.style.display === 'flex' && clickedTask === editedTask) {
		// if the popup is open and the clicked task (.edit-btn) is the same as the one being edited, close the popup
		closePopup()
		return
	}

	editedTask = clickedTask

	popupInput.value = editedTask.querySelector('.todo-text').textContent.trim()
	popupInfo.textContent = ''

	popup.style.display = 'flex'
	updatePopupPosition()
	popupInput.focus({ preventScroll: true })
}

// Function responsible for saving the changes made by the user in the popup
const changeTask = () => {
	if (popupInput.value.trim() !== '') {
		const textElement = editedTask.querySelector('.todo-text')
		const checkbox = editedTask.querySelector('input[type="checkbox"]')

		const oldText = textElement.textContent.trim()
		const newText = popupInput.value.trim()

		if (checkbox.checked && oldText !== newText) {
			checkbox.checked = false
			textElement.classList.remove('completed')

			ulList.prepend(editedTask)
		}

		textElement.textContent = newText

		saveTasks()
		closePopup()
	} else {
		popupInfo.textContent = 'You must provide some content!'
	}
}

// Deleting a task from the list
const deleteTask = e => {
	const deleteTodo = e.target.closest('li')
	deleteTodo.remove()

	if (popup.style.display === 'flex') closePopup()

	saveTasks()

	const currentTasks = ulList.querySelectorAll('li')

	if (currentTasks.length === 0) {
		alertInfo.textContent = 'No tasks on the list.'
	}
}

// Function for marking a task as completed
const completedTask = e => {
	if (e.target.type === 'checkbox') {
		const li = e.target.closest('li')
		const todoText = li.querySelector('.todo-text')

		todoText.classList.toggle('completed')

		const firstCompleted = ulList.querySelector('.completed')

		if (e.target.checked || !firstCompleted) {
			ulList.appendChild(li)
		} else {
			ulList.insertBefore(li, firstCompleted.closest('li'))
		}

		saveTasks()
	}
}

// Sets the popup position above the keyboard and adds space at the bottom of the page so tasks can be scrolled above the popup
const updatePopupPosition = () => {
	if (popup.style.display !== 'flex') return

	let keyboardHeight = 0

	if (window.visualViewport) {
		const vv = window.visualViewport

		// Height covered by the keyboard
		keyboardHeight = Math.max(window.innerHeight - vv.height - vv.offsetTop, 0)
	}

	popup.style.bottom = `${keyboardHeight + 10}px`
	document.body.style.marginBottom = `${keyboardHeight + popup.offsetHeight + 30}px`
}

// Function responsible for closing the popup
const closePopup = () => {
	popup.style.display = 'none'
	popup.style.bottom = ''
	popupInfo.textContent = ''
	document.body.style.marginBottom = ''
}

// Function responsible for accessibility
const handleLabelKeydown = e => {
	if (!['Enter', ' '].includes(e.key)) return

	const target = e.target

	const isControlBtn = target.closest('.edit-btn') || target.closest('.delete-btn')

	if (isControlBtn) return

	const isCheckboxOrText =
		target.classList.contains('custom-checkbox') ||
		target.classList.contains('todo-text') ||
		target.closest('.custom-checkbox') ||
		target.closest('.todo-text')

	if (!isCheckboxOrText) return

	e.preventDefault()

	const li = target.closest('li')
	const checkbox = li?.querySelector('input[type="checkbox"]')
	if (!checkbox) return

	checkbox.checked = !checkbox.checked
	checkbox.dispatchEvent(new Event('change', { bubbles: true }))
}

document.addEventListener('DOMContentLoaded', main)

/////////////////////////
// LOCAL STORAGE TASKS
/////////////////////////

const saveTasks = () => {
	const tasksObj = {
		tasks: [],
		maxId: 0,
	}

	document.querySelectorAll('.todo-list ul li').forEach(li => {
		const text = li.querySelector('.todo-text').textContent
		const completed = li.querySelector('input').checked

		const idNum = parseInt(li.id.split('-')[1])

		tasksObj.maxId = Math.max(tasksObj.maxId, idNum)

		tasksObj.tasks.push({
			id: li.id,
			text,
			completed,
		})
	})

	try {
		localStorage.setItem('tasks', JSON.stringify(tasksObj))
	} catch (e) {}
}

const loadTasks = () => {
	let data = { tasks: [], maxId: 0 }

	// corrupted data or lack of access to localStorage cannot crash the application
	try {
		const parsed = JSON.parse(localStorage.getItem('tasks'))

		if (parsed && Array.isArray(parsed.tasks)) {
			data = parsed
		}
	} catch (e) {}

	const tasks = data.tasks

	if (tasks.length > 0) {
		alertInfo.textContent = ''
	}

	tasks.forEach(task => {
		ulList.appendChild(createTaskElement(task))
	})

	idNumber = data.maxId // Saving the highest ID number
}

/////////////////////////
// LOCAL STORAGE THEME
/////////////////////////

const saveTheme = theme => {
	try {
		localStorage.setItem('theme', theme)
	} catch (e) {}
}