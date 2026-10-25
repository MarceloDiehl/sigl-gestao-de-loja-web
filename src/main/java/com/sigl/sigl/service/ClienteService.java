package com.sigl.sigl.service;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Cliente;
import com.sigl.sigl.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ValidatorService validatorService;

    @Autowired
    public ClienteService(ClienteRepository clienteRepository, ValidatorService validatorService) {
        this.clienteRepository = clienteRepository;
        this.validatorService = validatorService;
    }

    public Cliente salvar(Cliente cliente) {
        validarCliente(cliente);
        if (clienteRepository.existsByCpf(cliente.getCpf())) {
            throw new RegraDeNegocioException(HttpStatus.CONFLICT, "Já existe um cliente com este CPF.", "cpf");
        }
        return clienteRepository.save(cliente);
    }

    /**
     * A venda não aponta para o cliente (guarda só o CPF da nota, como texto), então excluir
     * o cliente não altera nenhuma venda registrada.
     */
    public void excluir(Integer id) {
        if (!clienteRepository.existsById(id)) {
            throw new RegraDeNegocioException(HttpStatus.NOT_FOUND, "Cliente não encontrado.");
        }
        clienteRepository.deleteById(id);
    }

    private void validarCliente(Cliente cliente) {
        validatorService.validarCpf(cliente.getCpf());
        validatorService.validarCep(cliente.getCep());
        validatorService.validarTelefone(cliente.getTelefone());
    }
}
