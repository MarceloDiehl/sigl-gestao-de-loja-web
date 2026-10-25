package com.sigl.sigl.repository;

import com.sigl.sigl.model.Venda;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Integer> {

    // vendedor, forma de pagamento e itens vêm na mesma consulta (sem uma consulta extra por venda)
    @EntityGraph(attributePaths = {"vendedor", "metodoPagamento", "itens"})
    List<Venda> findAllByOrderByDataHoraDescIdDesc();

    @EntityGraph(attributePaths = {"vendedor", "metodoPagamento", "itens"})
    @Query("""
            select distinct v from Venda v join v.itens i
            where i.codProduto like concat('%', :codigo, '%')
            order by v.dataHora desc, v.id desc""")
    List<Venda> buscarPorCodigoDeProduto(@Param("codigo") String codigo);

    @EntityGraph(attributePaths = {"vendedor", "metodoPagamento", "itens"})
    Optional<Venda> findComItensById(Integer id);

    boolean existsByVendedorId(Integer idVendedor);
}
