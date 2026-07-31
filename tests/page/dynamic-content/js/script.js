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
    newLink.innerHTML = `<a href="#dynamicLink${linkCount}">Dynamic Link ${linkCount}</a>`;
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

let initialViewportFilled = false; // New flag

function fillViewportWithLinks() {
    if (initialViewportFilled) return; // Only run once
    initialViewportFilled = true;

    let estimatedLinkHeight = 0;
    if (dynamicLinksDiv.children.length > 0) {
        estimatedLinkHeight = dynamicLinksDiv.children[0].offsetHeight; // Get actual height of a link item
    }

    if (estimatedLinkHeight > 0) {
        const availableHeight = window.innerHeight - dynamicLinksDiv.offsetTop;
        const linksToFillAvailableHeight = Math.ceil(availableHeight / estimatedLinkHeight);
        // We already have 3 links, so subtract them from the target
        const linksToAdd = Math.max(0, (linksToFillAvailableHeight + 5) - dynamicLinksDiv.children.length); // Ensure at least 20 links total, or enough to fill visible area + 5 extra
        addMoreLinks(linksToAdd);
    } else {
        // Fallback if height measurement fails (e.g., no links generated)
        addMoreLinks(20); // A reasonable default if dynamic calculation fails
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
        // The checkbox state is already checked here because this listener is only active if checked
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
        fillViewportWithLinks(); // Trigger filling the viewport when infinite scroll is enabled
    } else {
        window.removeEventListener('scroll', scrollListener);
        scrollListener = null;
    }
});

// Initial setup based on checkbox state
if (enableInfiniteScrollCheckbox.checked) {
    setupScrollListener();
}