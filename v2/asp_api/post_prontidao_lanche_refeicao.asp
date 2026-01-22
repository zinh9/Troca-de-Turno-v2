<%@ Language=VBScript %>
<!--#include file='includes/conexao.asp'-->
<!--#include file='includes/utils.asp'-->
<%
response.charset = "UTF-8"
response.codepage = 65001
response.contenttype = "application/json"

response.cachecontrol = "no-cache"
response.addheader "Pragma", "no-cache"
response.expires = -1

dim matricula, justificativa, horarioProntidaoLancheRefeicao, tipoProntidao
dim conn, sql, rs, success, message
dim colunaProntidaoTipo, colunaJustificativaTipo

matricula = request.form("matricula")
tipoProntidao = request.form("tipo")
justificativa = request.form("justificativaLancheRefeicao")

' matricula = "81053203"
' tipoProntidao = "refeicao"
' justificativa = "Falha Pátio: Não apontei o início e fim do intervalo"

success = "false"
message = ""
horarioProntidaoLancheRefeicao = now()

if tipoProntidao = "lanche" then
    colunaProntidaoTipo = "prontidao_lanche"
    colunaJustificativaTipo = "justificativa_atraso_prontidao_lanche"
elseif tipoProntidao = "refeicao" then
    colunaProntidaoTipo = "prontidao_refeicao"
    colunaJustificativaTipo = "justificativa_atraso_prontidao_refeicao"
end if

on error resume next

if justificativa = "" or isnull(justificativa) then
    sql = "UPDATE registros_apresentacao SET " & _
    colunaProntidaoTipo & " = Now() " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND fim_jornada IS NULL " & _
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1);"
else
    sql = "UPDATE registros_apresentacao SET " & _
    colunaProntidaoTipo & " = Now(), " & _
    colunaJustificativaTipo & " = '" & justificativa & "' " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND fim_jornada IS NULL " & _
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1);"
end if

set conn = getConexao()

conn.execute(sql)

' response.write(sql)

if err.number <> 0 then
    success = "false"
    message = "Erro ao registrar Fim de Jornada!"
else
    success = "true"
    message = "Fim de Jornada registrada com sucesso!"
end if

on error goto 0

conn.close
set conn = nothing

response.write "{""success"":" & lcase(success) & ",""message"":""" & message & """}"
response.end

%>