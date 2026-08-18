// Mobile nav menu toggle (hamburger button in the header)
const menuToggle = document.getElementById('menu-toggle');
const mainNav = document.getElementById('main-nav');
if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.textContent = isOpen ? '\u2715' : '\u2630';
    menuToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close the menu automatically once a link is tapped.
  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuToggle.textContent = '\u2630';
    });
  });
}

// Password show/hide toggle (signup + login pages)
// Only runs if a .password-toggle button exists on the page.
document.querySelectorAll('.password-toggle').forEach((toggleBtn) => {
  toggleBtn.addEventListener('click', () => {
    const input = toggleBtn.previousElementSibling;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? '\u{1F648}' : '\u{1F441}\uFE0F';
  });
});

// Signup / Login forms: on submit, send the user to the OTP checkpoint.
// (No real accounts are created here — this is a front-end demo flow.)
document.querySelectorAll('.auth-form:not(#otp-form)').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Signup form gets an extra check: must be 18+ to open an account.
    if (form.id === 'signup-form') {
      const age = Number(document.getElementById('age').value);
      const errorMsg = document.getElementById('signup-error');
      if (!age || age < 18) {
        errorMsg.textContent = 'You must be at least 18 years old to open an account.';
        return;
      }
      errorMsg.textContent = '';
    }

    window.location.href = 'otp.html';
  });
});

// OTP page: auto-advance to the next box as each digit is typed,
// and move to the dashboard once the code is submitted.
const otpDigits = document.querySelectorAll('.otp-digit');
otpDigits.forEach((digit, index) => {
  digit.addEventListener('input', () => {
    // Keep only the first character in case someone pastes multiple digits.
    digit.value = digit.value.replace(/[^0-9]/g, '').slice(0, 1);
    if (digit.value && index < otpDigits.length - 1) {
      otpDigits[index + 1].focus();
    }
  });

  digit.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !digit.value && index > 0) {
      otpDigits[index - 1].focus();
    }
  });
});

const otpForm = document.getElementById('otp-form');
if (otpForm) {
  otpForm.addEventListener('submit', (event) => {
    event.preventDefault();
    window.location.href = 'dashboard.html';
  });
}

const resendLink = document.getElementById('resend-code');
if (resendLink) {
  resendLink.addEventListener('click', (event) => {
    event.preventDefault();
    resendLink.textContent = 'Code sent!';
    setTimeout(() => { resendLink.textContent = 'Resend Code'; }, 2000);
  });
}

// Quick Transfer form (dashboard page)
// Balances live in this object — this is the single "source of truth"
// that every part of the page reads from and writes back to.
const accounts = {
  checking: 2150.00,
  savings: 1800.00
};

// Turns a number into "$1,234.56" formatting.
function formatCurrency(num) {
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Updates every part of the page that shows an account balance,
// so nothing goes out of sync with the accounts object above.
function refreshBalances() {
  // Metric cards
  const totalBalance = accounts.checking + accounts.savings;
  const balanceEl = document.getElementById('metric-balance');
  const savingsEl = document.getElementById('metric-savings');
  if (balanceEl) balanceEl.textContent = formatCurrency(totalBalance);
  if (savingsEl) savingsEl.textContent = formatCurrency(accounts.savings);

  // Dropdown option labels (both selects list Checking and Savings)
  document.querySelectorAll('#from-account option, #to-account option').forEach((option) => {
    if (option.value === 'checking') option.textContent = `Checking · ${formatCurrency(accounts.checking)}`;
    if (option.value === 'savings') option.textContent = `Savings · ${formatCurrency(accounts.savings)}`;
  });

  // Always-visible "Available: $X" line under From Account —
  // this is what actually solves the "how much is left" question,
  // since it doesn't require opening the dropdown to see.
  const fromSelectEl = document.getElementById('from-account');
  const availableEl = document.getElementById('available-balance');
  if (fromSelectEl && availableEl) {
    availableEl.textContent = `Available: ${formatCurrency(accounts[fromSelectEl.value])};`
  }
}

const transferForm = document.getElementById('transfer-form');
if (transferForm) {
  const confirmMsg = document.getElementById('transfer-confirm');
  const fromSelect = document.getElementById('from-account');
  const toSelect = document.getElementById('to-account');
  const transactionList = document.getElementById('transaction-list');

  // Set the correct "Available" amount right away, and again any time
  // the person switches which account they're sending from.
  refreshBalances();
  fromSelect.addEventListener('change', refreshBalances);

  transferForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number(document.getElementById('amount').value);
    const from = fromSelect.value;
    const to = toSelect.value;

    // --- Validation ---
    if (!amount || amount <= 0) {
      confirmMsg.style.color = '#C13B3B';
      confirmMsg.textContent = 'Enter an amount greater than $0.';
      return;
    }
    if (from === to) {
      confirmMsg.style.color = '#C13B3B';
      confirmMsg.textContent = 'Choose two different accounts.';
      return;
    }
    if (amount > accounts[from]) {
      confirmMsg.style.color = '#C13B3B';
      confirmMsg.textContent = 'Insufficient funds in that account.';
      return;
    }

    // --- Move the money ---
    accounts[from] -= amount;
    // Money only lands back in accounts if it's staying inside the bank.
    // If "to" is External Account, it simply leaves the total balance.
    if (to === 'checking' || to === 'savings') {
      accounts[to] += amount;
    }
    refreshBalances();

    // --- Log it in Recent Transactions ---
    if (transactionList) {
      const toLabel = to === 'external' ? 'External Account' : to.charAt(0).toUpperCase() + to.slice(1);
      const newItem = document.createElement('li');
      newItem.className = 'transaction-item';
      newItem.innerHTML = `
        <span class="transaction-icon">&#128176;</span>
        <span class="transaction-details">
          <span class="transaction-name">Transfer to ${toLabel}</span>
          <span class="transaction-date">Just now</span>
        </span>
        <span class="transaction-amount transaction-amount--negative">&minus;${formatCurrency(amount)}</span>
      `;
      transactionList.prepend(newItem);
    }

    // --- Confirmation message ---
    confirmMsg.style.color = '#1F7A5C';
    confirmMsg.textContent = `Transfer of ${formatCurrency(amount)} submitted.`;
    transferForm.reset();
    setTimeout(() => { confirmMsg.textContent = ''; }, 4000);
  });
}

// Transaction History filters
// Buttons carry a data-filter value ("all", "income", or "expense") and
// each transaction row carries a matching data-type value.
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    document.querySelectorAll('.transaction-item').forEach((item) => {
      const matches = filter === 'all' || item.dataset.type === filter;
      item.style.display = matches ? 'flex' : 'none';
    });
  });
});

// Statement download buttons (demo only — no real file is generated)
document.querySelectorAll('.statement-download').forEach((btn) => {btn.addEventListener('click', () => {
  const original = btn.textContent;
  btn.textContent = 'Downloading...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '\u2713 Downloaded';
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1500);
  }, 800);
});
});

// Settings page forms
// Each .settings-form shows its own confirmation message right below its
// own Save button, rather than one shared message for the whole page.
document.querySelectorAll('.settings-form').forEach((form) => {
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const confirmMsg = form.querySelector('.settings-confirm');

  // Extra validation just for the password change form.
  if (form.id === 'password-form') {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (newPass.length < 8) {
      confirmMsg.style.color = '#C13B3B';
      confirmMsg.textContent = 'New password must be at least 8 characters.';
      return;
    }
    if (newPass !== confirmPass) {
      confirmMsg.style.color = '#C13B3B';
      confirmMsg.textContent = 'New password and confirmation do not match.';
      return;
    }
  }

  confirmMsg.style.color = '#1F7A5C';
  confirmMsg.textContent = 'Saved successfully.';
  if (form.id === 'password-form') form.reset();
  setTimeout(() => { confirmMsg.textContent = ''; }, 3000);
});
});

// FAQ accordion
// Grab every question button, then attach a click listener to each one.
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach((question) => {
question.addEventListener('click', () => {
  const item = question.closest('.faq-item');
  const isOpen = item.classList.contains('open');

  // Close any other open FAQ item first (accordion behavior:
  // only one answer visible at a time).
  document.querySelectorAll('.faq-item.open').forEach((openItem) => {
    openItem.classList.remove('open');
    openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });

  // If the clicked item wasn't already open, open it now.
  if (!isOpen) {
    item.classList.add('open');
    question.setAttribute('aria-expanded', 'true');
  }
});
});


