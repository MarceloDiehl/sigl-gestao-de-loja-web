function inicializarConsultaAvancadaProdutos() {
    const $input = $('#cod_pesquisa');
    const $tbody = $('#tabela-produtos-body');
    const $btnExcluir = $('#excluir_produto');
    const $btnAtualizar = $('#atualizar_produto');

    const $resumo = $('#resumo-produtos');

    const moeda = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';

    let produtoSelecionado = null;

    function carregarProdutos(codigo = '') {
        $tbody.html('<tr><td colspan="7">Carregando produtos...</td></tr>');

        const url = codigo ? '/api/produtos/busca' : '/api/produtos';
        const params = codigo ? { codigo: codigo } : {};

        // produtos e tabelas de apoio (nomes de tipo e condição) chegam juntos; $.when entrega
        // a resposta de cada requisição como [dados, status, xhr]
        $.when(apoio(), $.getJSON(url, params))
            .done(function (respostaApoio, respostaProdutos) {
                const listas = respostaApoio[0];
                const data = respostaProdutos[0];
                $tbody.empty();

                if (!data || data.length === 0) {
                    $tbody.append('<tr><td colspan="7"><span class="vazio-disco"><i class="bi bi-vinyl"></i>Nenhum produto encontrado</span></td></tr>');
                    return;
                }

                data.forEach(p => {
                    const qtd = p.quantidade ?? 0;
                    const seloQtd = qtd === 0 ? 'selo-perigo' : (qtd <= 3 ? 'selo-alerta' : 'selo-ok');
                    $tbody.append(`
                        <tr data-codigo="${escaparHtml(p.codProduto)}">
                            <td class="codigo">${escaparHtml(p.codProduto)}</td>
                            <td>
                                <span class="titulo-celula">${escaparHtml(p.titulo)}</span>
                                <span class="sub-celula text-truncate" style="max-width: 42ch;">${escaparHtml(p.descricao)}</span>
                            </td>
                            <td><span class="tipo-produto"><i class="bi ${iconeDoTipo(p.idTipo)}"></i>${escaparHtml(descricaoDe(listas.tipos, p.idTipo))}</span></td>
                            <td><span class="selo">${escaparHtml(descricaoDe(listas.condicoes, p.idCondicao))}</span></td>
                            <td class="text-end"><span class="selo ${seloQtd}">${escaparHtml(qtd)}</span></td>
                            <td class="text-end fw-semibold">${moeda(p.valor)}</td>
                            <td>${dataBR(p.entrada)}</td>
                        </tr>
                    `);
                });
                $resumo.text(`${data.length} ${data.length === 1 ? 'produto' : 'produtos'}`);

                $tbody.find('tr').off('click').on('click', function () {
                    $tbody.find('tr').removeClass('table-active');
                    $(this).addClass('table-active');
                    produtoSelecionado = $(this).data('codigo');

                    $btnExcluir.prop('disabled', false);
                    $btnAtualizar.prop('disabled', false);
                });
            })
            .fail(function () {
                $tbody.html('<tr><td colspan="7" class="text-danger">Erro ao carregar produtos</td></tr>');
            });
    }

    carregarProdutos();

    let debounceTimer;
    $input.on('input', function () {
        clearTimeout(debounceTimer);
        const codigo = $(this).val().trim();
        debounceTimer = setTimeout(() => carregarProdutos(codigo), 300);
    });

    $btnExcluir.prop('disabled', true);
    $btnAtualizar.prop('disabled', true);

    // Exclusão em duas etapas: o botão abre um modal e só libera a exclusão
    // depois que o usuário digita o código do produto selecionado.
    const $modalExcluir = $('#modalExcluirProduto');
    const $confirmacao = $('#excluir-confirmacao');
    const $btnConfirmar = $('#btn-confirmar-exclusao');

    $btnExcluir.off('click').on('click', function () {
        if (!produtoSelecionado) return avisar("Selecione um produto antes de excluir.", "info");

        $.getJSON(`/api/produtos/codigo/${produtoSelecionado}`)
            .done(function (produto) {
                $('#excluir-produto-titulo').text(produto.titulo ?? '');
                $('#excluir-produto-codigo').text(produto.codProduto);
                $('#excluir-produto-qtd').text(produto.quantidade ?? 0);
                $confirmacao.val('').removeClass('is-invalid');
                $btnConfirmar.prop('disabled', true);
                $modalExcluir.modal('show');
            })
            .fail(function () {
                avisar("Erro ao buscar o produto para exclusão.", "erro");
            });
    });

    $modalExcluir.off('shown.bs.modal').on('shown.bs.modal', () => $confirmacao.trigger('focus'));

    $confirmacao.off('input').on('input', function () {
        $btnConfirmar.prop('disabled', $(this).val().trim() !== String(produtoSelecionado));
    });

    $('#formExcluirProduto').off('submit').on('submit', function (e) {
        e.preventDefault();
        if ($confirmacao.val().trim() !== String(produtoSelecionado)) return;

        $btnConfirmar.prop('disabled', true);
        $.ajax({
            url: `/api/produtos/${produtoSelecionado}`,
            method: 'DELETE'
        })
        .done(function (msg) {
            $modalExcluir.modal('hide');
            avisar(msg, "sucesso");
            carregarProdutos($input.val().trim());
            $btnExcluir.prop('disabled', true);
            $btnAtualizar.prop('disabled', true);
            produtoSelecionado = null;
        })
        .fail(function (xhr) {
            $btnConfirmar.prop('disabled', false);
            avisar("Erro ao excluir produto: " + mensagemDoServidor(xhr, "tente novamente."), "erro");
        });
    });

    $btnAtualizar.off('click').on('click', function () {
        if (!produtoSelecionado) return avisar("Selecione um produto antes de atualizar.", "info");

        $.getJSON(`/api/produtos/codigo/${produtoSelecionado}`)
            .done(function (produto) {
                // Preenche modal
                $('#codigo-produto-modal').val(produto.codProduto);
                $('#codigo-produto-modal-rotulo').text(produto.codProduto);
                $('#quantidade-modal').val(produto.quantidade);
                $('#valor-modal').val(produto.valor);
                $('#modalAtualizarProduto').modal('show');
            })
            .fail(function () {
                avisar("Erro ao buscar produto para atualização.", "erro");
            });
    });

    $('#formAtualizarProduto').off('submit').on('submit', function(e) {
        e.preventDefault();

        const produtoAtualizado = {
            quantidade: parseInt($('#quantidade-modal').val()),
            valor: parseFloat($('#valor-modal').val().replace(',', '.'))
        };

        $.ajax({
            url: `/api/produtos/${produtoSelecionado}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(produtoAtualizado)
        })
        .done(function() {
            avisar("Produto atualizado com sucesso.", "sucesso");
            $('#modalAtualizarProduto').modal('hide');
            carregarProdutos();
        })
        .fail(function(xhr) {
            avisar("Erro ao atualizar produto: " + mensagemDoServidor(xhr, "tente novamente."), "erro");
        });
    });

    function cadastrarProduto(e) {
        e.preventDefault();

        const novoProduto = {
            codProduto: $('#cod_produto').val(),
            descricao: $('#descricao').val(),
            quantidade: $('#quantidade').val(),
            valor: parseFloat($('#valor').val()),
            idTipo: $('#id_tipo').val(),
            idCondicao: $('#id_condicao').val(),
            titulo: $('#titulo').val(),
            entrada: $('#entrada').val()
        };

        $.ajax({
            url: '/api/produtos',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(novoProduto)
        })
        .done(function () {
            avisar("Produto cadastrado com sucesso.", "sucesso");
            $('#form_produto')[0].reset();
            carregarProdutos();
        })
        .fail(function (xhr) {
            avisar("Erro ao cadastrar produto: " + xhr.responseText, "erro");
        });
    }

    // Bind inicial
    $('#btn_cadastrar').off('click').on('click', cadastrarProduto);
}
