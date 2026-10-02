# Spec Delta

## ADDED Requirements

### Requirement: Los reportes cuentan el día del local

Analytics y el Dashboard SHALL agrupar los pedidos por día, semana, mes, hora
y día de la semana **en hora de Argentina**, sin importar la zona horaria del
servidor ni la del navegador.

#### Scenario: Un pedido de la noche

- **GIVEN** un pedido del jueves a las 22:30 de Argentina (viernes 01:30 UTC)
- **WHEN** se arma el gráfico de ventas por día, el de horas y el de días de
  la semana, con el servidor en UTC
- **THEN** cuenta en el jueves, en la hora 22 y en el jueves
