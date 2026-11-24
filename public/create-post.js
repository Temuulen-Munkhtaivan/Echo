const createPostForm = document.querySelector('form[action="/posts"]');
addCsrfToken(createPostForm);