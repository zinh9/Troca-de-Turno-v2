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

dim matricula, conn, sql, rs, success, message, code

matricula = request.form("matricula")

' matricula = "01106146"

success = "false"
message = ""
code = "ERROR"

on error resume next 

sql = "UPDATE registros_apresentacao SET " & _
"data_hora_refeicao_CPT = Now() " & _
"WHERE usuario_dss = '" & matricula & "' " & _
"AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"

set conn = getConexao()

conn.execute(sql)

if err.number <> 0 then
    message = "Erro ao Liberar Refeição (CPT)!"
else
    success = "true"
    message = "Liberação de Refeição registrada com sucesso!"
    code = "SUCCESS"
end if

on error goto 0

conn.close
set conn = nothing

ResponseWriteJSON success, code, message, "", ""

%>