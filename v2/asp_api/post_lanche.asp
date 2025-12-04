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

dim matricula, horarioAgora, justificativa
dim conn, sql, rs, success, message, code

matricula = request.form("matricula")
justificativa = request.form("justificativaLanchaRefeicao")

' matricula = "01004879"
' justificativa = "teste"

success = "false"
message = ""
code = "ERROR"
horarioAgora = now()

on error resume next
set conn = getConexao()

if justificativa <> "" or not isnull(justificativa) then
    sql = "UPDATE registros_apresentacao SET " & _
        "data_hora_lanche_patio = Now(), " & _
        "justificativa_atraso_lanche = '" & justificativa & "' " & _
        "WHERE usuario_dss = '" & matricula & "' " & _
        "AND fim_jornada IS NULL " & _
        "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
else
    sql = "UPDATE registros_apresentacao SET " & _
    "data_hora_lanche_patio = Now() " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND fim_jornada IS NULL " & _
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
end if

conn.execute(sql)

if err.number <> 0 then
    message = "Erro ao registrar Lanche!"
else
    success = "true"
    message = "Lanche registrada com sucesso!"
    code = "SUCCESS"
end if

on error goto 0

conn.close
set conn = nothing

ResponseWriteJSON success, code, message, horarioAgora, ""

%>