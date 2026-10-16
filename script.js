const todoInput = document.querySelector('.todo-input') // miejsce gdzie użytkownik wpisuje treść
const addBtn = document.querySelector('.add-btn') // przycisk dodający nowe zadanie
const alertInfo = document.querySelector('.alert-info') // alert informujący o braku zadań na liście

const settingsBtn = document.querySelector('.settings-btn') // przycisk otwierający panel ustawień
const settingsPanel = document.querySelector('.settings-panel') // panel ustawień
const closeBtn = document.querySelector('.close-btn') // przycisk zamykający panel ustawień
const colorBtns = document.querySelectorAll('.color-btn') // przyciski wyboru koloru motywu

const ulList = document.querySelector('.todo-list ul') // lista zadań
let idNumber = 0 // unikalne id dla każdego zadania

const popup = document.querySelector('.popup') // popup do edycji
const popupInfo = document.querySelector('.popup-info') // informacja w popupie
let editedTask // edytowane zadanie
const popupInput = document.querySelector('.popup-input') // input w popupie
const popupAcceptBtn = document.querySelector('.accept-btn') // przycisk zatwierdzający zmiany w popupie
const popupCancelBtn = document.querySelector('.cancel-btn') // przycisk anulujący zmiany w popupie

const main = () => {
	// funkcja ta odpala się po załadowaniu całego DOM, następnie wywołuje prepareDOMEvents

	prepareDOMEvents()
	if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
		todoInput.focus()
	} // autofocus tylko na desktopie

	loadTasks() // ładowanie zadań z localStorage
	// loadTheme() // motyw ładowany jest w HTML w sekcji head
}

const prepareDOMEvents = () => {
	// W tej funkcji dodajemy wszystkie potrzebne nasłuchiwacze zdarzeń (addEventListener)

	// Ustawianie początkowej wartości aria-hidden
	if (!settingsPanel.classList.contains('show')) {
		settingsPanel.setAttribute('aria-hidden', 'true')
	}

	// PANEL USTAWIEŃ
	//Włączanie i wylączanie panelu ustawień
	settingsBtn.addEventListener('click', () => {
		settingsPanel.classList.toggle('show')
		if (settingsPanel.classList.contains('show')) {
			settingsPanel.setAttribute('aria-hidden', 'false')
		} else {
			settingsPanel.setAttribute('aria-hidden', 'true')
		}
	})

	//Zamykanie panelu ustawień za pomocą X
	closeBtn.addEventListener('click', () => {
		settingsPanel.classList.remove('show')
		settingsPanel.setAttribute('aria-hidden', 'true')
	})

	// KLIKNIĘCIE POZA PANEL USTAWIEŃ ORAZ INPUT
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
		if (
			popup.style.display === 'flex' && // popup jest otwarty
			!e.target.closest('.edit-btn') && // kliknięcie NIE było na przycisku edycji
			!e.target.closest('.popup') // liknięcie NIE było w popupie
		) {
			closePopup()
		}

		// Ukrywanie alertu 'Enter task content' po kliknięciu poza input
		if (
			alertInfo.textContent === 'Enter task content!' &&
			!e.target.closest('.todo-input') &&
			!e.target.closest('.add-btn')
		) {
			const currentTasks = ulList.querySelectorAll('li')

			if (currentTasks.length === 0) {
				// Jeśli lista jest pusta, przywracamy pierwotny stan informacyjny
				alertInfo.textContent = 'No tasks on the list.'
			} else {
				// Jeśli na liście są zadania, całkowicie czyścimy tekst błędu
				alertInfo.textContent = ''
			}
		}
	})

	// Zmiana treści task jeśli klikniemy na Enter
	popupInput.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			changeTask()
		}
	})

	// Zamykanie popupa po kliknięciu Esc
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && popup.style.display === 'flex') {
			closePopup()
		}
	})

	//Zmiana koloru motywu
	colorBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const theme = btn.getAttribute('data-color')
			if (theme) {
				document.documentElement.style.setProperty('--theme-color', `var(${theme})`)
			}

			saveTheme(theme)
		})
	})

	// Aktualizacja pozycji popupa przy zmianie widocznego obszaru (np. pojawienie się klawiatury na mobile
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', updatePopupPosition)
		window.visualViewport.addEventListener('scroll', updatePopupPosition)
	}

	// Gdy popup jest otwarty, kliknięcie ołówka nie zabiera focus z inputu. Inaczej klawiatura na mobile się chowa i wraca, a strona skacze.
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

// Tworzymy element li
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

// Funkcja dodaje zadnie na początek listy; przy pustym polu pokazuje alert
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

// Wywołanie funkcji addNewTask (dodanie nowego zadania) na kliknięcie klawisza Enter
const enterCheck = e => {
	if (e.key === 'Enter') {
		addNewTask()
	}
}

// Funkcja obsługująca kliknięcia na przyciski edycji i usuwania
const checkClick = e => {
	const clickedEl = e.target.closest('button')
	if (!clickedEl) return //Jeśli closest nic nie znalazło (null), czyli kliknięto w tekst zadania, checkbox albo pusty obszar listy, funkcja kończy się od razu. To tzw. guard clause: odsiewa niepasujące przypadki na początku, żeby reszta kodu nie musiała się o nie martwić.

	if (clickedEl.classList.contains('edit-btn')) {
		editTask(e)
	} else if (clickedEl.classList.contains('delete-btn')) {
		deleteTask(e)
	}
}

// Funkcja obsługująca popup edycji zadania, którego przycisk .edit-btn kliknięto
const editTask = e => {
	const clickedTask = e.target.closest('li')

	// kliknięto edit-btn w zadaniu, które już edytujemy → zamykamy popup
	if (popup.style.display === 'flex' && clickedTask === editedTask) {
		// jeśli popup jest otwarty i kliknięte zadanie (.edit-btn) to to samo, do którego odnosi się otwarty popup to zamknij popup
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

// Funkcja odpowiadająca za zapisanie zmian wprowadzonych przez użytkownika w oknie popup
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

// Usuwanie zadania z listy
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

// Oznaczenie zadania jako wykonane
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

// Ustawia popup nad klawiaturą i dodaje miejsce na dole strony, żeby dało się przewinąć zadania ponad popup
const updatePopupPosition = () => {
	if (popup.style.display !== 'flex') return

	let keyboardHeight = 0

	if (window.visualViewport) {
		const vv = window.visualViewport

		// wysokość zasłonięta przez klawiaturę
		keyboardHeight = Math.max(window.innerHeight - vv.height - vv.offsetTop, 0)
	}

	popup.style.bottom = `${keyboardHeight + 10}px`
	document.body.style.marginBottom = `${keyboardHeight + popup.offsetHeight + 30}px`
}

// Funkcja odpowiadająca za zamknięcie popup
const closePopup = () => {
	popup.style.display = 'none'
	popup.style.bottom = ''
	popupInfo.textContent = ''
	document.body.style.marginBottom = ''
}

// Funkcja odpowiadająca za accessibility
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

	//uszkodzone dane lub brak dostępu do localStorage nie mogę wywalić aplikacji
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

	idNumber = data.maxId // Zapisujemy największy numer ID
}

/////////////////////////
// LOCAL STORAGE THEME
/////////////////////////

const saveTheme = theme => {
	try {
		localStorage.setItem('theme', theme)
	} catch (e) {}
}
