// =========================================================
// Avisos e confirmações em modal (o sistema não usa alert/confirm do navegador)
//   avisar('Produto cadastrado.', 'sucesso' | 'erro' | 'info')  -> Promise (resolve ao fechar)
//   confirmarAcao({ titulo, mensagem, botao, perigo })         -> Promise<boolean>
// =========================================================
function modalDeAviso() {
    let el = document.getElementById('modal-aviso');
    if (el) return el;
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade modal-aviso" id="modal-aviso" tabindex="-1" aria-labelledby="modal-aviso-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="d-flex gap-3 align-items-start">
                            <span class="aviso-icone"><i class="bi"></i></span>
                            <div>
                                <h5 class="modal-title mb-1" id="modal-aviso-titulo"></h5>
                                <p class="texto-suave mb-0" id="modal-aviso-mensagem"></p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-light" id="modal-aviso-cancelar" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="modal-aviso-ok">Ok</button>
                    </div>
                </div>
            </div>
        </div>`);
    el = document.getElementById('modal-aviso');
    // fica acima de qualquer outro modal aberto
    el.addEventListener('shown.bs.modal', function () {
        const fundos = document.querySelectorAll('.modal-backdrop');
        if (fundos.length > 1) fundos[fundos.length - 1].style.zIndex = 1075;
        document.getElementById('modal-aviso-ok').focus();
    });
    return el;
}

function abrirModalDeAviso({ tipo, titulo, mensagem, botao, cancelar, perigo }) {
    return new Promise(function (resolver) {
        const el = modalDeAviso();
        const icones = { sucesso: 'bi-check-lg', erro: 'bi-exclamation-triangle', info: 'bi-info-lg', pergunta: 'bi-exclamation-triangle' };
        el.className = 'modal fade modal-aviso aviso-' + tipo;
        el.querySelector('.aviso-icone i').className = 'bi ' + (icones[tipo] || icones.info);
        el.querySelector('#modal-aviso-titulo').textContent = titulo;
        el.querySelector('#modal-aviso-mensagem').textContent = mensagem || '';
        const ok = el.querySelector('#modal-aviso-ok');
        ok.textContent = botao;
        ok.className = 'btn ' + (perigo ? 'btn-danger' : 'btn-primary');
        el.querySelector('#modal-aviso-cancelar').hidden = !cancelar;

        let confirmado = false;
        ok.onclick = function () { confirmado = true; bootstrap.Modal.getOrCreateInstance(el).hide(); };
        el.addEventListener('hidden.bs.modal', function () { resolver(confirmado); }, { once: true });

        // se outro modal estiver fechando, espera ele sair antes de abrir o aviso
        const abrir = function () { bootstrap.Modal.getOrCreateInstance(el).show(); };
        const fechando = document.querySelector('.modal.show:not(#modal-aviso)');
        if (fechando && !fechando.classList.contains('totem')) setTimeout(abrir, 350); else abrir();
    });
}

function avisar(mensagem, tipo) {
    tipo = tipo || 'info';
    const titulos = { sucesso: 'Tudo certo', erro: 'Não foi possível concluir', info: 'Atenção' };
    return abrirModalDeAviso({ tipo: tipo, titulo: titulos[tipo] || titulos.info, mensagem: mensagem, botao: 'Ok', cancelar: false });
}

function confirmarAcao(opcoes) {
    return abrirModalDeAviso({
        tipo: 'pergunta', titulo: opcoes.titulo || 'Confirmar?', mensagem: opcoes.mensagem,
        botao: opcoes.botao || 'Confirmar', cancelar: true, perigo: opcoes.perigo !== false
    });
}

// Texto vindo do servidor que entra em HTML montado com template string: os caracteres especiais
// viram entidades (&lt; etc.) para o navegador mostrar o texto em vez de interpretá-lo como marcação.
function escaparHtml(valor) {
    const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(valor ?? '').replace(/[&<>"']/g, c => entidades[c]);
}

// Mensagem de erro de uma resposta da API: ProblemDetail ({detail}) ou texto simples.
// Página de erro em HTML ou resposta vazia viram a mensagem padrão.
function mensagemDoServidor(xhr, padrao) {
    let corpo = xhr.responseJSON;
    if (!corpo) {
        try { corpo = JSON.parse(xhr.responseText); } catch (e) { corpo = null; }
    }
    if (corpo && corpo.detail) return corpo.detail;
    if (corpo && corpo.message) return corpo.message;   // erro padrão do Spring
    const texto = (xhr.responseText || '').trim();
    return texto && !texto.startsWith('<') && texto.length < 300 ? texto : padrao;
}

// Erros por campo de uma resposta da API ({campos: {cpf: "Já existe..."}}), já com os nomes dos
// campos do formulário: nomes é o de-para {campoDoJson: nameDoInput}. Campo fora do de-para fica de fora.
function errosDosCampos(xhr, nomes) {
    let corpo = xhr.responseJSON;
    if (!corpo) {
        try { corpo = JSON.parse(xhr.responseText); } catch (e) { corpo = null; }
    }
    const erros = {};
    Object.entries((corpo && corpo.campos) || {}).forEach(([campo, mensagem]) => {
        if (nomes[campo]) erros[nomes[campo]] = mensagem;
    });
    return erros;
}

// Tabelas de apoio (tipos, condições, cargos, escolaridades, gêneros, formas de pagamento) vêm do banco
// por GET /api/apoio, uma vez por página: apoio() devolve sempre a mesma promessa.
let promessaApoio = null;
function apoio() {
    if (!promessaApoio) {
        promessaApoio = $.getJSON('/api/apoio');
        promessaApoio.fail(function () { promessaApoio = null; });   // falhou: tenta de novo na próxima chamada
    }
    return promessaApoio;
}

// Texto de um id numa lista de apoio; se o id não estiver na lista, mostra o próprio id
function descricaoDe(lista, id) {
    const opcao = (lista || []).find(o => o.id === Number(id));
    return opcao ? opcao.descricao : (id ?? '');
}

// Gerente: cancelar venda, excluir cliente e funcionários (RegrasDeAcesso.GERIR no servidor).
// Só esconde botões; quem não pode recebe 403 do servidor de qualquer forma.
function usuarioPodeGerir() {
    return document.body.dataset.podeGerir === 'true';
}

// Ícone de cada tipo de produto (apresentação, por isso fica no front; o nome do tipo vem do banco)
function iconeDoTipo(idTipo) {
    const icones = {
        1: 'bi-vinyl', 2: 'bi-disc', 3: 'bi-pencil', 4: 'bi-book',
        5: 'bi-bag', 6: 'bi-speaker', 7: 'bi-music-note-beamed', 8: 'bi-gem'
    };
    return icones[idTipo] || 'bi-box';
}

// Troca as opções do select pelas da lista, mantendo o "Selecione..." (value="") e o valor já escolhido
function preencherSelect($select, lista) {
    const valorAtual = $select.val();
    $select.find('option:not([value=""])').remove();
    lista.forEach(o => $('<option>').val(o.id).text(o.descricao).appendTo($select));
    if (valorAtual) $select.val(valorAtual);
}

$(document).ready(function () {
    const conteudoDinamico = $('#conteudo-dinamico');

    // Spring Security: toda chamada AJAX que altera dados (POST, PUT, PATCH, DELETE) precisa do token CSRF
    const csrfToken = $('meta[name="_csrf"]').attr('content');
    const csrfHeader = $('meta[name="_csrf_header"]').attr('content');
    if (csrfToken && csrfHeader) {
        $.ajaxSetup({ headers: { [csrfHeader]: csrfToken } });
    }

    // Sessão expirada: qualquer chamada que volte 401 leva para a tela de login
    $(document).ajaxError(function (event, xhr) {
        if (xhr.status === 401) {
            window.location.href = '/login?expirou';
        }
    });

    // Telas sem item próprio no menu acendem a seção de onde são abertas
    const secaoDoMenu = { '/cadastro-produto': '/pesquisa-avancada', '/cadastro-membro': '/pesquisa-membro' };

    function marcarMenuAtivo(url) {
        const alvo = secaoDoMenu[url] || url;
        $('.sidebar .navbar-nav .nav-link').removeClass('active').removeAttr('aria-current')
            .filter(function () { return $(this).attr('href') === alvo; })
            .addClass('active').attr('aria-current', 'page');
        $('#navbarNav.show').removeClass('show'); // fecha o menu no celular
    }

    // Tela atual no <body>: as animações de fundo só rodam na Início (nas telas de trabalho ficam paradas)
    document.body.dataset.tela = 'inicio';

    function carregarConteudo(url) {
        marcarMenuAtivo(url);
        document.body.dataset.tela = url.replace(/^\//, '') || 'inicio';
        window.scrollTo(0, 0);
        conteudoDinamico.html(
            '<div class="text-center my-5">' +
                '<div class="spinner-border text-primary" role="status">' +
                    '<span class="visually-hidden">Carregando...</span>' +
                '</div>' +
                '<p class="mt-2">Carregando...</p>' +
            '</div>'
        );

        conteudoDinamico.load(url, function (response, status, xhr) {
            if (status == "error") {
                if (xhr.status === 403) {
                    $(this).html(
                        '<div class="painel"><div class="vazio"><i class="bi bi-lock"></i>' +
                        'Seu cargo não tem acesso a esta tela.</div></div>'
                    );
                    return;
                }
                $(this).html(
                    "<p class='text-center text-danger'>Erro ao carregar a página: " +
                    xhr.status + " " + xhr.statusText + "</p>"
                );
            } else {
                // autofocus só vale no carregamento da página; nas telas trazidas por AJAX o foco é dado aqui
                $(this).find('[autofocus]').first().trigger('focus');

                if (url.includes('/cadastro-membro')) {
                    formularioParceiros();
                }

                if (url.includes('/cadastro-produto')) {
                    formularioProduto();
                }

                if (url.includes('/venda')) {
                    formularioVenda();
                }

                if (url.includes('/pesquisa-venda')) {
                    $.getScript('/script/consultaVendas.js')
                        .done(function () {
                            if (typeof inicializarConsultaVendas === 'function') {
                                inicializarConsultaVendas();
                            }
                        })
                        .fail(function () {
                            console.error('Falha ao carregar consultaVendas.js');
                        });
                }

                if (url.includes('/pesquisa-avancada')) {
                    $.getScript('/script/consultaAvancadaProdutos.js')
                        .done(function () {
                            if (typeof inicializarConsultaAvancadaProdutos === 'function') {
                                inicializarConsultaAvancadaProdutos();
                            }
                        })
                        .fail(function () {
                            console.error('Falha ao carregar consultaAvancadaProdutos.js');
                        });
                }

                if (url.includes('/pesquisa-produto')) {
                    $.getScript('/script/pesquisaProduto.js')
                        .done(function () {
                            if (typeof inicializarPesquisarProduto === 'function') {
                                inicializarPesquisarProduto();
                            }
                        })
                        .fail(function () {
                            console.error('Falha ao carregar pesquisarProduto.js');
                        });
                }
                if (url.includes('/pesquisa-membro')) {
                    $.getScript('/script/consultaMembros.js')
                        .done(function () {
                            if (typeof inicializarConsultaMembros === 'function') {
                                inicializarConsultaMembros('#conteudo-dinamico'); // passa o container
                            }
                        })
                        .fail(function () {
                            console.error('Falha ao carregar consultaMembros.js');
                        });
                }
            }
        });
    }

    $('.navbar-nav').on('click', 'a.nav-link, a.dropdown-item', function (event) {
            const url = $(this).attr('href');
            if (!url || url === '#') return;

            if (url.startsWith('/')) {
                event.preventDefault();
                if (url === '/' || url === '/login' || url.endsWith('.html')) {
                    window.location.href = url;
                } else {
                    carregarConteudo(url);
                }
            } else {
                event.preventDefault();
                carregarConteudo(url);
            }
        });

    conteudoDinamico.on('click', 'a.btn, button.btn, a[data-spa]', function (event) {
        const url = $(this).attr('href');
        if (url && url !== '#') {
            event.preventDefault();
            carregarConteudo(url);
        }
    });
});

// Campos numéricos (ex.: quantidade): troca as setas pretas do navegador por botões no estilo do sistema.
// Vale para as telas carregadas dinamicamente e para os modais dentro delas.
function aplicarCamposNumero(raiz) {
    $(raiz).find('input[type=number].form-control:not([readonly])').each(function () {
        const $campo = $(this);
        if ($campo.parent().hasClass('campo-numero')) return;
        $campo.wrap('<span class="campo-numero"></span>');
        const $botoes = $(
            '<span class="campo-numero-botoes">' +
            '<button type="button" tabindex="-1" data-passo="1" aria-label="Aumentar"><i class="bi bi-chevron-up"></i></button>' +
            '<button type="button" tabindex="-1" data-passo="-1" aria-label="Diminuir"><i class="bi bi-chevron-down"></i></button>' +
            '</span>');
        $campo.after($botoes);
    });
}

$(document).on('click', '.campo-numero-botoes button', function () {
    const campo = $(this).closest('.campo-numero').find('input')[0];
    if (!campo || campo.disabled) return;
    if (campo.value === '') campo.value = campo.min || 0;
    else if ($(this).data('passo') > 0) campo.stepUp(); else campo.stepDown();
    $(campo).trigger('input').trigger('change').trigger('focus');
});

$(function () {
    aplicarCamposNumero(document);
    new MutationObserver(function (mudancas) {
        mudancas.forEach(function (m) {
            m.addedNodes.forEach(function (n) { if (n.nodeType === 1) aplicarCamposNumero(n); });
        });
    }).observe(document.body, { childList: true, subtree: true });
});

// Efeitos do menu (brilho, foil e sulcos) partem do centro do disco desenhado no logo,
// em qualquer largura de tela (no celular o menu vira uma barra no topo e o logo muda de lugar).
// No logo-menu.png o furo do disco fica a 48,7% da largura e 67,1% da altura.
function alinharEfeitosAoLogo() {
    const sidebar = document.querySelector('.sidebar');
    const logo = document.querySelector('.marca img');
    if (!sidebar || !logo || !logo.complete) return;
    const s = sidebar.getBoundingClientRect(), l = logo.getBoundingClientRect();
    const x = (l.left - s.left + l.width * 0.487).toFixed(1) + 'px';
    const y = (l.top - s.top + l.height * 0.671).toFixed(1) + 'px';
    sidebar.style.setProperty('--logo-disco-x', x);
    sidebar.style.setProperty('--logo-disco-y', y);
    sidebar.style.setProperty('--cd-x', x);   // foil (versão Cores)
    sidebar.style.setProperty('--cd-y', y);
}
$(function () {
    alinharEfeitosAoLogo();
    $('.marca img').on('load', alinharEfeitosAoLogo);
    $(window).on('resize', alinharEfeitosAoLogo);
    if (window.ResizeObserver) new ResizeObserver(alinharEfeitosAoLogo).observe(document.querySelector('.sidebar') || document.body);
});
