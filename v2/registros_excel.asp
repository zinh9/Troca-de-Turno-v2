<!--#include file='asp_api/includes/conexao.asp'-->
<%
Response.Charset = "UTF-8"
Response.ContentType = "application/vnd.ms-excel"
Response.AddHeader "Content-Disposition", "attachment;filename=Registros da Troca de Turno.xls"

Dim rsCompleto, sqlCompleto, conn
set conn = getConexao()

sqlCompleto = "SELECT " & _
"login_dss.detalhe, " & _
"registros_apresentacao.supervisao_ra, " & _
"registros_apresentacao.local_trabalho_ra, " & _
"registros_apresentacao.data_hora_apresentacao, " & _
"registros_apresentacao.data_hora_prontidao_ra, " & _
"registros_apresentacao.tempo_apresentacao_prontidao_min, " & _
"registros_apresentacao.status_funcionario, " & _
"login_dss.horario_login_dss, " & _
"registros_apresentacao.justificativa_atraso_apresentacao, " & _
"registros_apresentacao.justificativa_atraso_prontidao, " & _
"registros_apresentacao.data_hora_lanche_patio, " & _
"registros_apresentacao.data_hora_refeicao_patio, " & _
"registros_apresentacao.fim_jornada_CPT, " & _
"registros_apresentacao.fim_jornada, " & _
"registros_apresentacao.justificativa_atraso_fim_jornada, " & _
"registros_apresentacao.chamada_CPT, " & _
"horarios_referencia.ref_horas, " & _
"horarios_referencia.ref_minutos " & _
"FROM (registros_apresentacao " & _
"INNER JOIN login_dss ON registros_apresentacao.usuario_dss = login_dss.usuario_dss) " & _
"INNER JOIN horarios_referencia ON registros_apresentacao.local_trabalho_ra = horarios_referencia.local_trabalho_ra AND login_dss.horario_login_dss = horarios_referencia.turno_funcionario " & _
"WHERE registros_apresentacao.data_hora_apresentacao >= DateAdd('m', -4, Date()) " & _
"ORDER BY registros_apresentacao.data_hora_prontidao_ra DESC"

Set rsCompleto = conn.Execute(sqlCompleto)
%>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
</head>
<body>
<%
Response.Write "<table border='1'>"
Response.Write "<tr><th>Nome</th><th>Turno</th><th>Data</th><th>Supervisão</th><th>Local</th><th>Ref. Horário</th><th>Apresentação</th><th>Just. Apresentação</th><th>Prontidão</th><th>Just. Prontidão</th><th>Chamada CPT</th><th>Tempo Apresentação-Prontidão</th><th>Status</th><th>Solicitação de Lanche</th><th>Solicitação de Refeição</th><th>Fim Jornada</th><th>Just. Fim Jornada</th></tr>"

Do While Not rsCompleto.EOF
    Response.Write "<tr>"
    Response.Write "<td>" & rsCompleto("detalhe") & "</td>"
    Response.Write "<td>" & rsCompleto("horario_login_dss") & "</td>"
    Response.Write "<td>" & DateValue(rsCompleto("data_hora_apresentacao")) & "</td>"

    If rsCompleto("supervisao_ra") = "PV_AB" Then
        Response.Write "<td>VPN</td>"
    Else
        Response.Write "<td>" & ucase(Replace(rsCompleto("supervisao_ra"), "_", " ")) & "</td>"
    End If

    Response.Write "<td>" & Replace(rsCompleto("local_trabalho_ra"), "_", " ") & "</td>"
    Response.Write "<td>" & rsCompleto("ref_horas") & ":" & rsCompleto("ref_minutos") & "</td>"
    Response.Write "<td>" & TimeValue(rsCompleto("data_hora_apresentacao")) & "</td>"
    Response.Write "<td>" & rsCompleto("justificativa_atraso_apresentacao") & "</td>"

    If IsNull(rsCompleto("data_hora_prontidao_ra")) Then
        Response.Write "<td></td>"
    Else
        Response.Write "<td>" & TimeValue(rsCompleto("data_hora_prontidao_ra")) & "</td>"
    End If

    Response.Write "<td>" & rsCompleto("justificativa_atraso_prontidao") & "</td>"

    If IsNull(rsCompleto("chamada_CPT")) Then
        Response.Write "<td></td>"
    Else
        Response.Write "<td>" & TimeValue(rsCompleto("chamada_CPT")) & "</td>"
    End If

    Response.Write "<td>" & rsCompleto("tempo_apresentacao_prontidao_min") & "</td>"
    Response.Write "<td>" & rsCompleto("status_funcionario") & "</td>"

    If IsNull(rsCompleto("data_hora_lanche_patio")) Then
        Response.Write "<td></td>"
    Else
        Response.Write "<td>" & TimeValue(rsCompleto("data_hora_lanche_patio")) & "</td>"
    End If

    If IsNull(rsCompleto("data_hora_refeicao_patio")) Then
        Response.Write "<td></td>"
    Else
        Response.Write "<td>" & TimeValue(rsCompleto("data_hora_refeicao_patio")) & "</td>"
    End If

    If IsNull(rsCompleto("fim_jornada")) Then
        Response.Write "<td></td>"
    Else
        Response.Write "<td>" & TimeValue(rsCompleto("fim_jornada")) & "</td>"
    End If

    If IsNull(rsCompleto("justificativa_atraso_fim_jornada")) Then
      Response.Write "<td></td>"
    Else
      Response.Write "<td>" & rsCompleto("justificativa_atraso_fim_jornada") & "</td>"
    End If
    ' Response.Write "<td>" & rsCompleto("justificativa_atraso_fim_jornada") & "</td>"

    'Response.Write "</tr>"
    rsCompleto.MoveNext
Loop

Response.Write "</table>"
%>
</body>
</html>