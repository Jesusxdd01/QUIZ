let questions = [];
let currentQuestion = 0;
let correctCount = 0;
let incorrectCount = 0;
let totalQuestions = 0;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('questions.json');
    questions = await res.json();
    
    // 1. Mezclar el orden de las preguntas
    shuffleArray(questions); 
    
    // 2. Mezclar las opciones dentro de cada pregunta
    questions.forEach(shuffleQuestionOptions);
    
    totalQuestions = questions.length; 
    loadQuestion();
  } catch (error) {
    console.error("Error cargando el JSON:", error);
  }
});

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; 
  }
}

function shuffleQuestionOptions(question) {
  // Guardamos las opciones con su índice original para no perder la referencia
  const options = question.options.map((option, index) => ({
    text: option,
    originalIndex: index
  }));

  shuffleArray(options); // Mezclar opciones

  // Actualizar el texto de las opciones en la pregunta
  question.options = options.map(option => option.text);

  // LÓGICA CORREGIDA:
  // Detectar si el JSON usa 'correctIndices' (array) o 'correctIndex' (numero)
  let originalCorrectIndexes = [];
  
  if (question.correctIndices && Array.isArray(question.correctIndices)) {
    // Caso: Pregunta de múltiples respuestas
    originalCorrectIndexes = question.correctIndices;
  } else if (question.correctIndex !== undefined) {
    // Caso: Pregunta de respuesta única (lo convertimos a array para estandarizar)
    originalCorrectIndexes = [question.correctIndex];
  }

  // Mapear los índices originales a las nuevas posiciones después de mezclar
  // Guardamos esto en una nueva propiedad unificada 'finalCorrectIndexes'
  question.finalCorrectIndexes = originalCorrectIndexes.map(originalIdx => 
    options.findIndex(opt => opt.originalIndex === originalIdx)
  );
}

function loadQuestion() {
  const q = questions[currentQuestion];
  document.getElementById('question').innerText = q.question;
  
  // Mostrar si admite múltiples respuestas en el título
  const numAnswers = q.finalCorrectIndexes.length;
  if (numAnswers > 1) {
    document.getElementById('question').innerText += ` (${numAnswers} respuestas)`;
  }

  document.getElementById('progress').innerText = `Question ${currentQuestion + 1} of ${totalQuestions}`;
  
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  document.getElementById('submitBtn').disabled = true;
  document.getElementById('nextBtn').disabled = true;

  // Usamos la nueva propiedad unificada para determinar el máximo
  const maxSelections = q.finalCorrectIndexes.length; 

  q.options.forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'option';
    
    const input = document.createElement('input');
    // Si solo hay 1 respuesta, usamos 'radio' para mejor UX, si son varias usamos 'checkbox'
    input.type = maxSelections === 1 ? 'radio' : 'checkbox';
    input.name = 'option';
    input.value = index;
    
    // Solo limitamos selección si es checkbox
    if (maxSelections > 1) {
        input.onclick = () => limitSelection(maxSelections); 
    } else {
        // Si es radio, habilitamos el botón al hacer click
        input.onclick = () => { document.getElementById('submitBtn').disabled = false; };
    }

    label.appendChild(input);
    const textSpan = document.createElement('span');
    textSpan.textContent = option;
    label.appendChild(textSpan);
    optionsDiv.appendChild(label);
  });
}

function limitSelection(maxSelections) {
  const selected = document.querySelectorAll('input[name="option"]:checked');
  
  // Si intenta seleccionar más de lo permitido
  if (selected.length > maxSelections) {
    // Desmarcar el que se acaba de clicar (o el último de la lista)
    // Para UX más suave, simplemente evitamos que se marque el último, 
    // pero tu lógica original de desmarcar el último de la lista también funciona.
    // Aquí forzamos a desmarcar el elemento que causó el exceso para prevenirlo.
    event.target.checked = false; 
    return; // Salimos para no activar el botón si no es válido
  }

  // Habilitar botón solo si se han seleccionado EXACTAMENTE las necesarias? 
  // O al menos 1? Generalmente se espera que el usuario marque todas.
  // Aquí habilitamos si hay al menos 1 seleccionada.
  document.getElementById('submitBtn').disabled = selected.length === 0;
}

function submitAnswer() {
  const q = questions[currentQuestion];
  const selectedInputs = document.querySelectorAll('input[name="option"]:checked');
  const selectedIndexes = Array.from(selectedInputs).map(input => parseInt(input.value));
  
  // Usamos la propiedad unificada
  const correctIndexes = q.finalCorrectIndexes;

  const options = document.querySelectorAll('.option');
  options.forEach((option, index) => {
    const input = option.querySelector('input');
    input.disabled = true; // Bloquear inputs
    
    // Marcar las respuestas que ERAN correctas (verde)
    if (correctIndexes.includes(index)) {
      option.classList.add('correct');
    }
  });

  // Validar si es correcto
  // 1. La cantidad seleccionada debe ser igual a la cantidad correcta
  // 2. Todos los seleccionados deben estar en la lista de correctos
  const isCorrect = selectedIndexes.length === correctIndexes.length &&
    selectedIndexes.every(idx => correctIndexes.includes(idx));

  if (isCorrect) {
    correctCount++;
    // Efecto visual opcional para todo correcto
  } else {
    incorrectCount++;
    // Marcar en rojo las que el usuario seleccionó y eran ERROR
    selectedIndexes.forEach(i => {
      if (!correctIndexes.includes(i)) {
        options[i].classList.add('incorrect');
      }
    });
  }

  updateScore();
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('nextBtn').disabled = false;
}

function updateScore() {
  document.getElementById('correctCount').innerText = correctCount;
  document.getElementById('incorrectCount').innerText = incorrectCount;
}

function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    loadQuestion();
  } else {
    document.querySelector('.quiz-container').innerHTML = `
      <h2>Quiz Completed! 🎉</h2>
      <p>✅ Correct answers: ${correctCount}</p>
      <p>❌ Incorrect answers: ${incorrectCount}</p>
      <p>📊 Questions answered: ${totalQuestions} of ${totalQuestions}</p>
      <button onclick="location.reload()">Restart</button>
    `;
  }
}