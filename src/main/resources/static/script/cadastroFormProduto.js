function formularioProduto() {
    console.log("Inicializando formulário de cadastro de produto com jQuery Validation...");

    const $form = $('#formulario-produto');
    const $mensagemFeedback = $('#mensagem-feedback');

    // Tipos e condições vêm do banco (GET /api/apoio); o valor de cada opção já é o id
    const selectsPreenchidos = apoio().then(function (listas) {
        preencherSelect($('#tipo-produto'), listas.tipos);
        preencherSelect($('#condicao-produto'), listas.condicoes);
    });

    function limparFormulario() {
        $form[0].reset();
        $mensagemFeedback.empty().removeClass('alert alert-success alert-danger');
        $form.find('.is-invalid').removeClass('is-invalid');
        $form.find('.invalid-feedback').remove();
        $form.validate().resetForm();
        $('#codigo-produto').prop('disabled', false);
        $('#data-produto').val(new Date().toLocaleDateString('sv-SE'));
        atualizarContadorDescricao();
    }

    function atualizarContadorDescricao() {
        $('#descricao-contador').text($('#descricao-produto').val().length);
    }
    $('#descricao-produto').off('input.contador').on('input.contador', atualizarContadorDescricao);

    $('#limpar-cadastro-produto').off('click').on('click', function() {
        limparFormulario();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const codigoParam = urlParams.get("codigo");
    if (codigoParam) {
        // espera as opções dos selects existirem antes de marcar o tipo e a condição do produto
        selectsPreenchidos.then(() => $.ajax({
            url: `/api/produtos/codigo/${codigoParam}`,
            method: 'GET',
            dataType: 'json'
        })
        .done(function(produto) {
            if (produto) {
                $('#codigo-produto').val(produto.codProduto).prop('disabled', true);
                $('#titulo-produto').val(produto.titulo);
                $('#descricao-produto').val(produto.descricao);
                $('#valor-produto').val(produto.valor);
                $('#quantidade-produto').val(produto.quantidade);
                $('#tipo-produto').val(produto.idTipo);
                $('#condicao-produto').val(produto.idCondicao);
                $('#data-produto').val(produto.entrada);
            }
        })
        .fail(function() {
            avisar("Erro ao carregar produto para atualização.", "erro");
        }));
    }

    $form.validate({
        rules: {
            'titulo-produto': { required: true },
            'descricao-produto': { required: true, minlength: 10 },
            'valor-produto': { required: true, number: true, min: 0.01 },
            'quantidade-produto': { required: true, digits: true, min: 0 },
            'tipo': { required: true },
            'condicao': { required: true },
            'data-produto': { required: true, dateISO: true },
            'codigo-produto': { required: true, minlength: 6, maxlength: 6 },
        },
        messages: {
            'titulo-produto': { required: "Informe o título do produto." },
            'descricao-produto': { required: "Forneça uma descrição detalhada do produto.", minlength: "A descrição deve ter no mínimo 10 caracteres." },
            'valor-produto': { required: "Informe o valor unitário do produto.", number: "Digite um valor numérico válido.", min: "O valor unitário deve ser maior que zero." },
            'quantidade-produto': { required: "Informe a quantidade em estoque.", digits: "A quantidade deve ser um número inteiro.", min: "A quantidade não pode ser negativa." },
            'tipo': { required: "Selecione o tipo de produto." },
            'condicao': { required: "Selecione a condição do produto." },
            'data-produto': { required: "Informe a data de inclusão.", dateISO: "Data inválida (AAAA-MM-DD)." },
            'codigo-produto': { required: "Informe o código do produto.", minlength: "O código deve ter 6 dígitos.", maxlength: "O código deve ter 6 dígitos." },
        },
        errorElement: 'div',
        errorPlacement: function (error, element) {
            error.addClass('invalid-feedback');
            if (element.is('select')) error.insertAfter(element);
            else element.closest('[class*="col-"]').append(error);
        },
        highlight: function (element) { $(element).addClass('is-invalid').removeClass('is-valid'); },
        unhighlight: function (element) { $(element).removeClass('is-invalid').addClass('is-valid'); },

        submitHandler: function (form, event) {
            event.preventDefault();
            $mensagemFeedback.empty().removeClass('alert alert-success alert-danger');

            const produtoData = {
                codProduto: $('#codigo-produto').val().trim(),
                titulo: $('#titulo-produto').val().trim(),
                descricao: $('#descricao-produto').val().trim(),
                valor: parseFloat($('#valor-produto').val().replace(',', '.')),
                quantidade: parseInt($('#quantidade-produto').val()),
                entrada: $('#data-produto').val(),
                idTipo: parseInt($('#tipo-produto').val()),
                idCondicao: parseInt($('#condicao-produto').val())
            };

            console.log("Dados do produto a serem enviados:", produtoData);

            const ajaxOptions = {
                url: codigoParam ? `/api/produtos/${codigoParam}` : '/api/produtos',
                method: codigoParam ? 'PUT' : 'POST',
                contentType: 'application/json',
                data: JSON.stringify(produtoData)
            };

            $.ajax(ajaxOptions)
            .done(function(response) {
                let msg = codigoParam ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!";
                avisar(msg, "sucesso");
                $mensagemFeedback.addClass('alert alert-success').text(msg + (response.id ? ' ID: ' + response.id : ''));
                if (!codigoParam) limparFormulario(); // Limpa apenas se for cadastro
            })
            .fail(function(xhr) {
                const errorMessage = mensagemDoServidor(xhr, 'Erro ao salvar produto. Verifique os dados e tente novamente.');
                // campos recusados pelo servidor (nome no JSON -> name do input) ficam marcados no formulário
                const erros = errosDosCampos(xhr, {
                    codProduto: 'codigo-produto', titulo: 'titulo-produto', descricao: 'descricao-produto',
                    valor: 'valor-produto', quantidade: 'quantidade-produto', entrada: 'data-produto',
                    idTipo: 'tipo', idCondicao: 'condicao'
                });
                if (xhr.status === 409 && !codigoParam) erros['codigo-produto'] = errorMessage;   // código repetido
                $form.validate().showErrors(erros);
                $mensagemFeedback.addClass('alert alert-danger').text(errorMessage);
            });
        }
    });

    limparFormulario();
}
