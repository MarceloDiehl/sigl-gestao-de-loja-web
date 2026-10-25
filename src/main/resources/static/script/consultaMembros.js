function inicializarConsultaMembros(containerSelector) {
    const $container = $(containerSelector);
    const $inputCpf = $container.find('#cpf_pesquisa');
    const $tbody = $container.find('#tabela-membros-body');
    const $btnExcluir = $container.find('#excluir_membro');
    const $resumo = $container.find('#resumo-membros');
    const $detalhes = $container.find('#detalhes-membro');

    // Cargos, escolaridades e gêneros vêm do banco (apoio()), carregados antes da primeira lista
    let listas = { cargos: [], escolaridades: [], generos: [] };

    const dataBR = (iso) => iso ? String(iso).split('-').reverse().join('/') : '';
    const vazio = '<span class="texto-suave">—</span>';
    const ou = (v) => (v === null || v === undefined || v === '') ? vazio : escaparHtml(v);

    const detalhesVazios = $detalhes.html();
    let membros = [];
    let membroSelecionado = null;

    // Quem não é gerente recebe a ficha resumida do cliente (sem RG, nascimento e endereço):
    // os campos que não vieram somem, em vez de aparecerem como "—"
    function camposVisiveis(campos) {
        if (usuarioPodeGerir()) return campos;
        return campos.filter(([, valor]) => valor !== null && valor !== undefined && valor !== '');
    }

    function mostrarDetalhes(m) {
        if (!m) { $detalhes.html(detalhesVazios); return; }

        const campos = [
            ['CPF', m.cpf], ['RG', m.rg], ['Nascimento', dataBR(m.dataNascimento)], ['Telefone', m.telefone],
            ['Endereço', [m.endereco, m.numeroPredial].filter(Boolean).join(', ')], ['Bairro', m.bairro],
            ['Cidade / UF', [m.cidade, m.estado].filter(Boolean).join(' / ')], ['CEP', m.cep]
        ];
        if (m.tipo === 'cliente') {
            campos.push(['Cliente desde', dataBR(m.clienteDesde)]);
        } else {
            campos.push(
                ['E-mail', m.email], ['Cargo', descricaoDe(listas.cargos, m.idCargo)],
                ['Escolaridade', descricaoDe(listas.escolaridades, m.idEscolaridade)],
                ['Especialidade', m.especialidade], ['Gênero', descricaoDe(listas.generos, m.idGenero)],
                ['Contato de emergência', m.contatoEmergencia], ['Admissão', dataBR(m.dataEntrada)], ['CTPS', m.ctpas]
            );
        }

        $detalhes.html(`
            <div class="painel-cabecalho">
                <h2 class="painel-titulo">${escaparHtml(m.nome)} ${escaparHtml(m.sobrenome)}</h2>
                ${seloTipo(m.tipo)}
            </div>
            <div class="painel-corpo">
                <dl>${camposVisiveis(campos).map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${ou(valor)}</dd></div>`).join('')}</dl>
            </div>
        `);
    }

    function seloTipo(tipo) {
        return tipo === 'cliente'
            ? '<span class="selo selo-destaque">Cliente</span>'
            : '<span class="selo selo-funcionario">Funcionário</span>';
    }

    function carregarMembros(cpf = '') {
        $tbody.html('<tr><td colspan="6">Carregando membros...</td></tr>');
        $resumo.text('');
        membroSelecionado = null;
        $btnExcluir.prop('disabled', true);
        mostrarDetalhes(null);

        // funcionários só para o gerente; os demais cargos veem apenas clientes
        const buscarFuncionarios = () => usuarioPodeGerir()
            ? $.getJSON('/api/funcionarios', { cpf: cpf })
            : $.Deferred().resolve([]).promise();

        $.getJSON('/api/clientes', { cpf: cpf })
            .done(function (clientes) {
                buscarFuncionarios()
                    .done(function (funcionarios) {
                        $tbody.empty();

                        membros = [
                            ...clientes.map(c => ({ ...c, tipo: 'cliente' })),
                            ...funcionarios.map(f => ({ ...f, tipo: 'funcionario' }))
                        ];

                        if (membros.length === 0) {
                            $tbody.append('<tr><td colspan="6"><span class="vazio-disco"><i class="bi bi-people"></i>Nenhum membro encontrado</span></td></tr>');
                            return;
                        }

                        membros.forEach((m, i) => {
                            const desde = m.tipo === 'cliente' ? m.clienteDesde : m.dataEntrada;
                            const subtitulo = m.tipo === 'cliente' ? '' : descricaoDe(listas.cargos, m.idCargo);
                            $tbody.append(`
                                <tr data-tipo="${m.tipo}" data-id="${escaparHtml(m.id)}" data-indice="${i}">
                                    <td>
                                        <span class="titulo-celula">${escaparHtml(m.nome)} ${escaparHtml(m.sobrenome)}</span>
                                        ${subtitulo ? `<span class="sub-celula">${subtitulo}</span>` : ''}
                                    </td>
                                    <td>${seloTipo(m.tipo)}</td>
                                    <td class="codigo">${ou(m.cpf)}</td>
                                    <td>${ou(m.telefone)}</td>
                                    <td>${ou([m.cidade, m.estado].filter(Boolean).join(' / '))}</td>
                                    <td>${ou(dataBR(desde))}</td>
                                </tr>
                            `);
                        });

                        const qtdClientes = clientes.length, qtdFunc = funcionarios.length;
                        const textoClientes = `${qtdClientes} ${qtdClientes === 1 ? 'cliente' : 'clientes'}`;
                        $resumo.text(usuarioPodeGerir()
                            ? `${textoClientes} · ${qtdFunc} ${qtdFunc === 1 ? 'funcionário' : 'funcionários'}`
                            : textoClientes);

                        $tbody.find('tr').off('click').on('click', function () {
                            $tbody.find('tr').removeClass('table-active');
                            $(this).addClass('table-active');

                            membroSelecionado = {
                                tipo: $(this).data('tipo'),
                                id: $(this).data('id')
                            };
                            mostrarDetalhes(membros[$(this).data('indice')]);
                            $btnExcluir.prop('disabled', false);
                        });
                    })
                    .fail(function () {
                        $tbody.html('<tr><td colspan="6" class="text-danger">Erro ao carregar funcionários</td></tr>');
                    });
            })
            .fail(function () {
                $tbody.html('<tr><td colspan="6" class="text-danger">Erro ao carregar clientes</td></tr>');
            });
    }

    let debounceTimer;
    $inputCpf.on('input', function () {
        clearTimeout(debounceTimer);
        const cpf = $(this).val().trim();
        debounceTimer = setTimeout(() => carregarMembros(cpf), 300);
    });

    apoio()
        .then(function (resposta) { listas = resposta; })
        .always(function () { carregarMembros(); });   // sem as listas, mostra os ids no lugar dos nomes

    $btnExcluir.off('click').on('click', function () {
        if (!membroSelecionado) {
            avisar("Selecione um membro antes de excluir.", "info");
            return;
        }

        const { tipo, id } = membroSelecionado;
        const nome = $('#tabela-membros-body tr.table-active td:first .titulo-celula').first().text().trim() || 'Este membro';
        confirmarAcao({
            titulo: 'Excluir ' + (tipo === 'cliente' ? 'cliente' : 'funcionário') + '?',
            mensagem: `${nome} será removido da comunidade. Esta ação não pode ser desfeita.`,
            botao: 'Excluir'
        }).then(function (sim) {
        if (!sim) return;
        $.ajax({
            url: `/api/${tipo === 'cliente' ? 'clientes' : 'funcionarios'}/${id}`,
            method: 'DELETE'
        })
        .done(function (msg) {
            avisar(msg, "sucesso");
            carregarMembros($inputCpf.val().trim());
        })
        .fail(function (xhr) {
            avisar("Erro ao excluir: " + mensagemDoServidor(xhr, "tente novamente."), "erro");
        });
        });
    });

    $btnExcluir.prop('disabled', true);
    $inputCpf.mask('000.000.000-00');
}
