const STORAGE_KEY = 'dgym30-presencas';

function todayISO() {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
}

function currentMonthISO(date) {
  return date.slice(0, 7);
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { students: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.students)) {
      throw new Error('Formato inválido');
    }
    return parsed;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return { students: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function describeAttendance(student, monthKey) {
  const monthlyCount = student.attendance.filter((date) =>
    date.startsWith(monthKey)
  ).length;

  const lastAttendance = [...student.attendance]
    .sort()
    .reverse()
    .find(() => true);

  const parts = [`${monthlyCount} aula${monthlyCount === 1 ? '' : 's'} no mês`];

  if (lastAttendance) {
    parts.push(`Última presença em ${formatDate(lastAttendance)}`);
  }

  return parts.join(' • ');
}

function formatRankingItem(student, monthKey, index, category) {
  const monthlyCount = student.attendance.filter((date) =>
    date.startsWith(monthKey)
  ).length;

  const requirementMet =
    category === 'transformacao' ? monthlyCount >= 15 : false;

  const badgeClass = requirementMet ? 'badge success' : 'badge';
  const badgeText =
    category === 'transformacao'
      ? requirementMet
        ? 'Meta atingida'
        : `${15 - monthlyCount} para a meta`
      : `${monthlyCount} aulas`;

  return {
    monthlyCount,
    html: `
      <li class="ranking-item">
        <span class="rank-number">#${index + 1}</span>
        <div class="ranking-info">
          <strong>${student.name}</strong>
          <p class="student-meta">${monthlyCount} aula${
            monthlyCount === 1 ? '' : 's'
          } no mês</p>
        </div>
        <span class="${badgeClass}">${badgeText}</span>
      </li>
    `,
  };
}

function buildRankingText(students, categoryLabel, monthKey) {
  if (!students.length) {
    return `Ranking ${categoryLabel}: nenhum participante cadastrado.`;
  }

  const lines = students.map((student, index) => {
    const monthlyCount = student.attendance.filter((date) =>
      date.startsWith(monthKey)
    ).length;
    const highlight =
      categoryLabel === 'Transformação' && monthlyCount >= 15
        ? ' ✅ meta atingida'
        : '';
    return `${index + 1}º ${student.name} - ${monthlyCount} aula${
      monthlyCount === 1 ? '' : 's'
    }${highlight}`;
  });

  return `Ranking ${categoryLabel} (${monthKey}):\n${lines.join('\n')}`;
}

function setupApp() {
  const state = loadState();
  const studentTemplate = document.getElementById('student-template');
  const studentsList = document.getElementById('students-list');
  const datePicker = document.getElementById('date-picker');
  const monthPicker = document.getElementById('month-picker');
  const form = document.getElementById('student-form');
  const resetButton = document.getElementById('reset-data');
  const copyButtons = document.querySelectorAll('[data-copy]');

  let selectedDate = todayISO();
  let selectedMonth = currentMonthISO(selectedDate);

  datePicker.value = selectedDate;
  monthPicker.value = selectedMonth;

  function renderStudents() {
    studentsList.innerHTML = '';

    if (!state.students.length) {
      const empty = document.createElement('p');
      empty.className = 'student-meta';
      empty.textContent = 'Nenhum participante cadastrado ainda.';
      studentsList.appendChild(empty);
      return;
    }

    const monthKey = currentMonthISO(selectedDate);

    state.students
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .forEach((student) => {
        const clone = studentTemplate.content.firstElementChild.cloneNode(true);
        const nameEl = clone.querySelector('.student-name');
        const metaEl = clone.querySelector('.student-meta');
        const checkbox = clone.querySelector('.presence-checkbox');

        nameEl.textContent = student.name;
        metaEl.textContent = `${
          student.category === 'transformacao' ? 'Transformação' : 'Constância'
        } • ${describeAttendance(student, monthKey)}`;

        checkbox.checked = student.attendance.includes(selectedDate);

        checkbox.addEventListener('change', () => {
          const hasAttendance = student.attendance.includes(selectedDate);
          if (checkbox.checked && !hasAttendance) {
            student.attendance.push(selectedDate);
          } else if (!checkbox.checked && hasAttendance) {
            student.attendance = student.attendance.filter(
              (date) => date !== selectedDate
            );
          }

          saveState(state);
          renderStudents();
          renderRanking();
        });

        studentsList.appendChild(clone);
      });
  }

  function renderRanking() {
    const monthKey = selectedMonth;

    const transformacaoList = document
      .getElementById('transformacao-ranking')
      .querySelector('.ranking-list');
    const constanciaList = document
      .getElementById('constancia-ranking')
      .querySelector('.ranking-list');

    transformacaoList.innerHTML = '';
    constanciaList.innerHTML = '';

    const transformacaoStudents = state.students
      .filter((student) => student.category === 'transformacao')
      .map((student) => ({
        ...student,
        monthlyCount: student.attendance.filter((date) =>
          date.startsWith(monthKey)
        ).length,
      }))
      .sort((a, b) => b.monthlyCount - a.monthlyCount || a.name.localeCompare(b.name, 'pt-BR'));

    const constanciaStudents = state.students
      .filter((student) => student.category === 'constancia')
      .map((student) => ({
        ...student,
        monthlyCount: student.attendance.filter((date) =>
          date.startsWith(monthKey)
        ).length,
      }))
      .sort((a, b) => b.monthlyCount - a.monthlyCount || a.name.localeCompare(b.name, 'pt-BR'));

    transformacaoStudents.forEach((student, index) => {
      const { html } = formatRankingItem(student, monthKey, index, 'transformacao');
      transformacaoList.insertAdjacentHTML('beforeend', html);
    });

    constanciaStudents.forEach((student, index) => {
      const { html } = formatRankingItem(student, monthKey, index, 'constancia');
      constanciaList.insertAdjacentHTML('beforeend', html);
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form['student-name'].value.trim();
    const category = form['student-category'].value;

    if (!name || !category) {
      createToast('Preencha nome e categoria.');
      return;
    }

    const duplicate = state.students.some(
      (student) => student.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      createToast('Já existe um participante com esse nome.');
      return;
    }

    state.students.push({
      id: generateId(),
      name,
      category,
      attendance: [],
    });

    saveState(state);
    form.reset();
    renderStudents();
    renderRanking();
    createToast('Participante adicionado!');
  });

  datePicker.addEventListener('change', () => {
    selectedDate = datePicker.value || todayISO();
    renderStudents();
  });

  monthPicker.addEventListener('change', () => {
    selectedMonth = monthPicker.value || currentMonthISO(todayISO());
    renderStudents();
    renderRanking();
  });

  resetButton.addEventListener('click', () => {
    const confirmed = confirm(
      'Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.'
    );

    if (!confirmed) return;

    state.students = [];
    saveState(state);
    renderStudents();
    renderRanking();
    createToast('Dados removidos.');
  });

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const category = button.dataset.copy;
      const monthKey = selectedMonth;

      const students = state.students
        .filter((student) => student.category === category)
        .map((student) => ({
          ...student,
          monthlyCount: student.attendance.filter((date) =>
            date.startsWith(monthKey)
          ).length,
        }))
        .sort((a, b) =>
          b.monthlyCount - a.monthlyCount || a.name.localeCompare(b.name, 'pt-BR')
        );

      const categoryLabel =
        category === 'transformacao' ? 'Transformação' : 'Constância';
      const text = buildRankingText(students, categoryLabel, monthKey);

      try {
        await navigator.clipboard.writeText(text);
        createToast('Ranking copiado para a área de transferência!');
      } catch (error) {
        console.error('Erro ao copiar ranking:', error);
        createToast('Não foi possível copiar. Copie manualmente.');
      }
    });
  });

  renderStudents();
  renderRanking();
}

if (document.readyState !== 'loading') {
  setupApp();
} else {
  document.addEventListener('DOMContentLoaded', setupApp);
}
