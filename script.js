let draggedItem = null;
let pdfData; // Armazenar os dados do PDF
let zoomLevel = 0.8; // Nível de zoom padrão

document.getElementById('upload-pdf').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file.type === "application/pdf") {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            pdfData = new Uint8Array(this.result); // Armazena os dados do PDF

            // Usando pdfjsLib para carregar o PDF
            pdfjsLib.getDocument(pdfData).promise.then(function (pdf) {
                const pdfContainer = document.getElementById('pdf-container');
                pdfContainer.innerHTML = '';

                // Renderizando as páginas do PDF
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    pdf.getPage(pageNum).then(function (page) {
                        renderPage(page, pageNum);
                    });
                }
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// Função para renderizar uma página do PDF
function renderPage(page, pageNum) {
    const viewport = page.getViewport({ scale: zoomLevel });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    // Renderiza a página no canvas
    page.render(renderContext).promise.then(function () {
        const pageDiv = document.createElement('div');
        pageDiv.classList.add('page');
        pageDiv.setAttribute('draggable', true);
        pageDiv.setAttribute('data-page-number', pageNum);

        // Adicionando eventos de drag
        pageDiv.addEventListener('dragstart', handleDragStart);
        pageDiv.addEventListener('dragover', handleDragOver);
        pageDiv.addEventListener('drop', handleDrop);

        // Adiciona o canvas com a página ao div da página
        pageDiv.appendChild(canvas);
        document.getElementById('pdf-container').appendChild(pageDiv);
    });
}

// Funções de zoom
document.getElementById('zoom-in').addEventListener('click', function () {
    zoomLevel += 0.1; // Aumenta o zoom
    renderAllPages(); // Re-renderiza todas as páginas
});

document.getElementById('zoom-out').addEventListener('click', function () {
    if (zoomLevel > 0.1) {
        zoomLevel -= 0.1; // Diminui o zoom
    }
    renderAllPages(); // Re-renderiza todas as páginas
});

// Função para re-renderizar todas as páginas
function renderAllPages() {
    const pdfContainer = document.getElementById('pdf-container');
    const pages = pdfContainer.querySelectorAll('.page');
    pdfContainer.innerHTML = ''; // Limpa o contêiner antes de re-renderizar
    pages.forEach(page => {
        const pageNum = parseInt(page.getAttribute('data-page-number'));
        pdfjsLib.getDocument(pdfData).promise.then(function (pdf) {
            pdf.getPage(pageNum).then(function (page) {
                renderPage(page, pageNum); // Re-renderiza cada página
            });
        });
    });
}

function handleDragStart(event) {
    draggedItem = this;  // Define o item que está sendo arrastado
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        this.classList.add('dragging');  // Aplica uma classe para estilo
    }, 0);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event) {
    event.preventDefault();

    // Se o item arrastado é diferente do item onde foi solto
    if (draggedItem !== this) {
        // Verifica se o alvo já está em um grupo
        if (this.parentNode.classList.contains('group')) {
            // Se sim, adiciona o item arrastado ao grupo existente
            this.parentNode.appendChild(draggedItem);
        } else {
            // Caso contrário, cria um novo grupo
            const group = document.createElement('div');
            group.classList.add('group');

            // Cria o contêiner para o nome do grupo e o botão
            const groupHeader = document.createElement('div');
            groupHeader.classList.add('group-header');

            // Cria um input para o nome do grupo
            const groupName = document.createElement('input');
            groupName.classList.add('group-name');
            groupName.setAttribute('type', 'text');
            groupName.setAttribute('placeholder', 'Nome do Grupo');

            // Cria o botão para salvar o grupo
            const saveButton = document.createElement('button');
            saveButton.classList.add('save-group-btn');
            saveButton.textContent = 'Salvar Grupo';
            saveButton.addEventListener('click', function () {
                saveGroupAsPDF(group);
            });

            // Adiciona o nome do grupo e o botão ao contêiner group-header
            groupHeader.appendChild(groupName);
            groupHeader.appendChild(saveButton);

            // Insere o contêiner group-header e os itens arrastados dentro do grupo
            this.parentNode.insertBefore(group, this);
            group.appendChild(groupHeader);  // Adiciona o header (nome + botão)
            group.appendChild(this);  // Adiciona o alvo ao grupo
            group.appendChild(draggedItem);  // Adiciona o arrastado ao grupo
        }
    }

    // Remove a classe de estilo "dragging"
    draggedItem.classList.remove('dragging');
    draggedItem = null;
}

// Função para salvar as páginas do grupo como PDF
async function saveGroupAsPDF(group) {
    const pdfDoc = await PDFLib.PDFDocument.create();

    // Obtém o arquivo PDF diretamente do campo de upload
    const fileInput = document.getElementById('upload-pdf');
    const file = fileInput.files[0];
    const fileBytes = await file.arrayBuffer();
    const loadedPdf = await PDFLib.PDFDocument.load(fileBytes);

    // Itera sobre cada página dentro do grupo
    const pages = group.querySelectorAll('.page');
    for (let page of pages) {
        const pageNumber = parseInt(page.getAttribute('data-page-number'));

        // Copia as páginas do PDF original
        const [copiedPage] = await pdfDoc.copyPages(loadedPdf, [pageNumber - 1]);
        pdfDoc.addPage(copiedPage);
    }

    // Gera o arquivo PDF e baixa
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = group.querySelector('.group-name').value || 'grupo.pdf';
    link.click();
}
