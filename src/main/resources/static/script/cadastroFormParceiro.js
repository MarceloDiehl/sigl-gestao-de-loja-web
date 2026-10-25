function formularioParceiros() {
    // Gênero, cargo e escolaridade vêm do banco (GET /api/apoio); o valor de cada opção é o id
    apoio().then(function (listas) {
        preencherSelect($('#genero_parceiro'), listas.generos);
        preencherSelect($('#cargo_parceiro'), listas.cargos);
        preencherSelect($('#escolaridade_parceiro'), listas.escolaridades);
    });

    function alternarCamposParceiro(animar = true) {
        const duracao = animar ? 150 : 0;
        const tipoSelecionado = $('input[name="parceiro"]:checked').val();
        // Blocos marcados com data-somente="cliente" / "funcionario" no HTML
        const camposFuncionario = $('#formulario-membros [data-somente="funcionario"]');
        const campoCliente = $('#formulario-membros [data-somente="cliente"]');

        if (tipoSelecionado === 'cliente') {
            campoCliente.slideDown(duracao);
            camposFuncionario.slideUp(duracao);
        } else {
            campoCliente.slideUp(duracao);
            camposFuncionario.slideDown(duracao);
        }
    }
    alternarCamposParceiro(false);
    $('input[name="parceiro"]').on('change', alternarCamposParceiro);
    $('#limpar-cadastro-membro').on('click', () => setTimeout(alternarCamposParceiro, 0));

    // Máscaras
    $('#telefone_parceiro').mask('(00) 00000-0000');
    $('#cep_parceiro').mask('00000-000');
    $('#cpf_parceiro').mask('000.000.000-00');
    $('#emergencia_parceiro').mask('(00) 00000-0000');

    $.validator.addMethod("cpf", function (value, element) {
        value = jQuery.trim(value);
        value = value.replace(/\./g, '').replace('-', '');
        if (value.length === 0) return true;
        if (/^(\d)\1+$/.test(value)) return false;
        let add = 0;
        for (let i = 0; i < 9; i++) add += parseInt(value.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(value.charAt(9))) return false;
        add = 0;
        for (let i = 0; i < 10; i++) add += parseInt(value.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(value.charAt(10))) return false;
        return true;
    }, "Por favor, informe um CPF válido.");

    $('#formulario-membros').validate({
        rules: {
            nome_parceiro: { required: true, minlength: 2 },
            sobrenome_parceiro: { required: true, minlength: 2 },
            telefone_parceiro: { required: true },
            data_parceiro: { required: true, dateISO: true },
            endereco_parceiro: { required: true },
            cidade_parceiro: { required: true },
            ctpas_parceiro: { required: true },
            uf_parceiro: { required: true, minlength: 2, maxlength: 2 },
            numero_parceiro: { required: true, number: true },
            cep_parceiro: { required: true },
            bairro_cliente: { required: true },
            rg_parceiro: { required: true },
            cpf_parceiro: { required: true, cpf: true },
            email_parceiro: { required: true, email: true },
            genero: { required: true },
            especialidade_parceiro: { required: true },
            desde_parceiro: { required: { depends: () => $('#tipo_cliente').is(':checked') } },
            emergencia_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') } },
            cargo_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') } },
            escolaridade_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') } },
            ingresso_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') } },
            senha_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') }, minlength: 5 },
            senha2_parceiro: { required: { depends: () => $('#tipo_funcionario').is(':checked') }, minlength: 5, equalTo: "#senha_parceiro" }
        },

        messages: {
            parceiro: { required: "Por favor, selecione um tipo de cadastro." },
            nome_parceiro: { required: "O nome é obrigatório.", minlength: "Mínimo 2 caracteres." },
            sobrenome_parceiro: { required: "O sobrenome é obrigatório.", minlength: "Mínimo 2 caracteres." },
            telefone_parceiro: { required: "O telefone é obrigatório." },
            data_parceiro: { required: "A data de nascimento é obrigatória.", dateISO: "Data inválida." },
            endereco_parceiro: { required: "O endereço é obrigatório." },
            cidade_parceiro: { required: "A cidade é obrigatória." },
            ctpas_parceiro: { required: "Campo obrigatório." },
            uf_parceiro: { required: "UF obrigatória.", minlength: "Deve ter 2 caracteres.", maxlength: "Deve ter 2 caracteres." },
            numero_parceiro: { required: "O número é obrigatório.", number: "Digite apenas números." },
            cep_parceiro: { required: "O CEP é obrigatório." },
            bairro_cliente: { required: "O bairro é obrigatório." },
            rg_parceiro: { required: "O RG é obrigatório." },
            cpf_parceiro: { required: "O CPF é obrigatório." },
            email_parceiro: { required: "O e-mail é obrigatório.", email: "E-mail inválido." },
            genero: { required: "Por favor, selecione o gênero." },
            desde_parceiro: { required: "A data é obrigatória." },
            emergencia_parceiro: { required: "O telefone de emergência é obrigatório." },
            cargo_parceiro: { required: "O cargo é obrigatório." },
            escolaridade_parceiro: { required: "A escolaridade é obrigatória." },
            ingresso_parceiro: { required: "A data de ingresso é obrigatória." },
            senha_parceiro: { required: "A senha é obrigatória.", minlength: "Mínimo 5 caracteres." },
            senha2_parceiro: { required: "Confirme a senha.", minlength: "Mínimo 5 caracteres.", equalTo: "As senhas não correspondem." },
            especialidade_parceiro: { required: "Campo obrigatório." }
        },

        submitHandler: function (form) {
            const tipo = $('input[name="parceiro"]:checked').val();

            const dados = {
                nome: $('#nome_parceiro').val(),
                sobrenome: $('#sobrenome_parceiro').val(),
                telefone: $('#telefone_parceiro').val(),
                email: $('#email_parceiro').val(),
                dataNascimento: $('#data_parceiro').val(), // yyyy-mm-dd
                endereco: $('#endereco_parceiro').val(),
                cidade: $('#cidade_parceiro').val(),
                estado: $('#uf_parceiro').val(),
                numeroPredial: parseInt($('#numero_parceiro').val()),
                cep: $('#cep_parceiro').val(),
                bairro: $('#bairro_parceiro').val(),
                rg: $('#rg_parceiro').val(),
                cpf: $('#cpf_parceiro').val()
            };

            if (tipo === 'cliente') {
                dados.clienteDesde = $('#desde_parceiro').val();
            } else if (tipo === 'funcionario') {
                dados.ctpas = $('#ctpas_parceiro').val();
                dados.contatoEmergencia = $('#emergencia_parceiro').val();
                dados.idCargo = parseInt($('#cargo_parceiro').val());
                dados.idEscolaridade = parseInt($('#escolaridade_parceiro').val());
                dados.especialidade = $('#especialidade_parceiro').val();
                dados.dataEntrada = $('#ingresso_parceiro').val(); // yyyy-mm-dd
                dados.idGenero = parseInt($('#genero_parceiro').val());
                // senha como digitada: o servidor gera o hash BCrypt (FuncionarioService)
                dados.senha = $('#senha_parceiro').val();
            }

            const url = tipo === 'cliente' ? '/api/clientes' : '/api/funcionarios';

            $.ajax({
                url: url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(dados),
                success: function (resposta) {
                    avisar(resposta, "sucesso");
                    $("#formulario-membros")[0].reset();
                    alternarCamposParceiro();
                },
                error: function (xhr) {
                    // CPF ou e-mail já cadastrado: a mensagem aparece também embaixo do campo
                    $("#formulario-membros").validate().showErrors(
                        errosDosCampos(xhr, { cpf: 'cpf_parceiro', email: 'email_parceiro' }));
                    avisar("Erro ao cadastrar: " + mensagemDoServidor(xhr, "tente novamente."), "erro");
                }
            });
        },

        errorElement: 'div',
        errorPlacement: function (error, element) {
            error.addClass('invalid-feedback');
            element.closest('[class*="col-"]').append(error);
        },
        highlight: function (element) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function (element) {
            $(element).removeClass('is-invalid');
        }
    });
}
