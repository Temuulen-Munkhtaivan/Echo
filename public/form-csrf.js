// Add CSRF tokens to all POST forms on the page
document.querySelectorAll('form[method="POST" i]')
    .forEach(addCsrfToken);