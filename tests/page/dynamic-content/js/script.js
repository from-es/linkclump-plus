let linkCount = 0;
const dynamicLinksDiv = document.getElementById('dynamic-links');
const loadingIndicator = document.getElementById('loading-indicator');
const addLinkBtn = document.getElementById('addLinkBtn');
const removeLinkBtn = document.getElementById('removeLinkBtn');
const enableInfiniteScrollCheckbox = document.getElementById('enableInfiniteScroll');
let isLoading = false;

function addSingleLink() {
    linkCount++;
    const newLink = document.createElement('p');
    newLink.className = 'link-item';
    const anchor = document.createElement('a');
    anchor.href = `#dynamicLink${linkCount}`;
    anchor.textContent = `Dynamic Link ${linkCount}`;
    newLink.appendChild(anchor);
    dynamicLinksDiv.appendChild(newLink);
}

function removeLastLink() {
    if (dynamicLinksDiv.lastChild) {
        dynamicLinksDiv.removeChild(dynamicLinksDiv.lastChild);
        linkCount--;
    }
}

function addMoreLinks(num = 5, callback = null) {
    if (isLoading) return;
    isLoading = true;
    loadingIndicator.style.display = 'block';

    setTimeout(() => {
        for (let i = 0; i < num; i++) {
            addSingleLink();
        }
        isLoading = false;
        loadingIndicator.style.display = 'none';
        if (callback) {
            callback();
        }
    }, 500);
}

function fillViewportWithLinks() {
    const rect = dynamicLinksDiv.getBoundingClientRect();
    const firstChild = dynamicLinksDiv.children[0];
    const estimatedLinkHeight = (firstChild && firstChild.offsetHeight > 0) ? firstChild.offsetHeight : 30;
    const remainingHeight = Math.max(window.innerHeight - rect.top, 300);
    const targetLinks = Math.ceil(remainingHeight / Math.max(estimatedLinkHeight, 20)) + 5;
    const linksToAdd = Math.max(0, targetLinks - dynamicLinksDiv.children.length);

    if (linksToAdd > 0) {
        addMoreLinks(linksToAdd);
    }
}

// Initial load: Only 3 links are displayed by default
addMoreLinks(3);

addLinkBtn.addEventListener('click', addSingleLink);
removeLinkBtn.addEventListener('click', removeLastLink);

let scrollListener = null;

function setupScrollListener() {
    if (scrollListener) {
        window.removeEventListener('scroll', scrollListener);
    }
    scrollListener = () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            addMoreLinks();
        }
    };
    window.addEventListener('scroll', scrollListener);
}

enableInfiniteScrollCheckbox.addEventListener('change', () => {
    if (enableInfiniteScrollCheckbox.checked) {
        setupScrollListener();
        fillViewportWithLinks(); // Ensure page is tall enough to scroll
    } else {
        if (scrollListener) {
            window.removeEventListener('scroll', scrollListener);
            scrollListener = null;
        }
    }
});

// Initial setup based on checkbox state
if (enableInfiniteScrollCheckbox.checked) {
    setupScrollListener();
    fillViewportWithLinks();
}