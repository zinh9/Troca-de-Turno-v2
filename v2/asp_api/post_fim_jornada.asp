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

dim matricula, justificativa, horarioFimJornada
dim conn, sql, rs, success, message

matricula = request.form("matricula")
justificativa = request.form("justificativaFimJornada")

' matricula = "81053394"
' justificativa = null

success = "false"
message = ""
horarioFimJornada = now()

on error resume next

if justificativa = "" or isnull(justificativa) then
    sql = "UPDATE registros_apresentacao SET " & _
    "fim_jornada = Now() " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND fim_jornada IS NULL " & _
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
else
    sql = "UPDATE registros_apresentacao SET " & _
    "fim_jornada = Now(), " & _
    "justificativa_atraso_fim_jornada = '" & justificativa & "' " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND fim_jornada IS NULL " & _
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
end if

set conn = getConexao()

conn.execute(sql)

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
