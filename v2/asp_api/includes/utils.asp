<!--#include file='conexao.asp' -->
<%

sub ResponseWriteJSON(success, code, message, horarioApresentacao, status)
    response.write "{"
    response.write " ""success"":" & lcase(success) & ","
    response.write " ""code"":""" & EscapeJSON(code) & ""","
    response.write " ""message"":""" & EscapeJSON(message) & ""","
    response.write " ""horarioApresentacao"":""" & FormatISOData(horarioApresentacao) & ""","
    response.write " ""status"":""" & EscapeJSON(status) & """"
    response.write "}"
    response.end
end sub

function buildJSONInfo(nome, att, ref)
    dim str
    str = "{"
    str = str & " ""nomeFormatado"":""" & EscapeJSON(nome) & ""","
    str = str & " ""ultimaAtualizacao"":""" & EscapeJSON(att) & ""","
    str = str & " ""horarioReferencia"":""" & EscapeJSON(ref) & """"
    str = str & " }"
    buildJSONInfo = str
end function

' [SUBSTITUA ISTO no seu utils.asp]
function buildJSONTabela(rs)
    dim str, count
    str = "["
    count = 0

    if not rs.eof then
        do while not rs.eof
            if count > 0 then str = str & ","

            dim lancheStatus, refeicaoStatus
            lancheStatus = GetLancheStatus(rs("turno"), rs("lanche"), rs("refeicao"), rs("totalNoLocal"), rs("lancheManhaCount"), rs("metadeTurma"), rs("intervaloLanche"), rs("lancheEscolhaCount"))
            refeicaoStatus = GetRefeicaoStatus(rs("turno"), rs("lanche"), rs("refeicao"), rs("totalNoLocal"), rs("lancheManhaCount"), rs("metadeTurma"), rs("intervaloLanche"), rs("lancheEscolhaCount"))

            str = str & "{"
            str = str & " ""matricula"":""" & EscapeJSON(rs("matricula")) & ""","
            str = str & " ""nome"":""" & ucase(EscapeJSON(rs("nome"))) & ""","
            str = str & " ""cargo"":""" & ucase(EscapeJSON(rs("cargo"))) & ""","
            str = str & " ""local"":""" & EscapeJSON(replace(rs("local"), "_", " ")) & ""","
            str = str & " ""turno"":"""& EscapeJSON(rs("turno")) & ""","
            str = str & " ""apresentacao"":""" & (rs("apresentacao")) & ""","
            str = str & " ""dataHoraApresentacaoCompleta"":""" & FormatISOData(rs("dataHoraApresentacaoCompleta")) & """," ' Importante para o timer do CCP
            str = str & " ""justificativaApresentacao"":""" & EscapeJSON(rs("justificativaApresentacao")) & ""","
            str = str & " ""statusApresentacao"":""" & EscapeJSON(rs("status_apresentacao")) & ""","
            str = str & " ""prontidao"":""" & (rs("prontidao")) & ""","
            str = str & " ""statusProntidao"":""" & rs("statusProntidao") & ""","
            str = str & " ""justificativaProntidao"":""" & EscapeJSON(rs("justificativaProntidao")) & ""","
            str = str & " ""lancheStatus"":""" & EscapeJSON(lancheStatus) & ""","
            ' str = str & " ""intervaloLanche"":""" & EscapeJSON(rs("intervaloLanche")) & ""","
            str = str & " ""refeicaoStatus"":""" & EscapeJSON(refeicaoStatus) & ""","
            str = str & " ""lancheCPT"":""" & EscapeJSON(rs("lancheCPT")) & ""","
            str = str & " ""refeicaoCPT"":""" & EscapeJSON(rs("refeicaoCPT")) & ""","
            str = str & " ""statusFimJornada"":" & lcase(rs("statusFimJornada")) & ","
            str = str & " ""fimJornada"":""" & (rs("fimJornada")) & ""","
            str = str & " ""justificativaFimJornada"":""" & EscapeJSON(rs("justificativaFimJornada")) & ""","
            str = str & " ""chamadaCPT"":""" & (rs("chamada_CPT")) & ""","
            str = str & " ""fimJornadaCPT"":""" & (rs("fim_jornada_CPT")) & """"
            str = str & "}"

            count = count + 1
            rs.MoveNext
        Loop
    end if

    str = str & "]"
    buildJSONTabela = str
end function

function GetLancheStatus(turno, lanche, refeicao, totalNoLocal, lancheManhaCount, metadeTurma, intervaloLanche, lancheEscolhaCount)
    if not isnull(lanche) or lanche <> "" then
        GetLancheStatus = "TIMER_LANCHE." & FormatISOData(lanche)
        exit function
    end if

    dim agora
    agora = time()
    GetLancheStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"

    select case turno
        case "05x17", "06x18"
            if (isnull(intervaloLanche) or intervaloLanche = "") and agora <= timeserial(10, 0, 0) then
                if lancheEscolhaCount < metadeTurma then
                    GetLancheStatus = "HABILITAR_ESCOLHA-08:00 às 10:30"
                else
                    GetLancheStatus = "14:00 às 16:30"
                end if
            elseif (isnull(intervaloLanche) or intervaloLanche = "") and agora > timeserial(10, 0, 0) then
                if agora <= timeserial(14, 0, 0) then
                    GetLancheStatus = "14:00 às 16:30"
                elseif agora <= timeserial(16, 30, 0) then
                    if not isnull(refeicao) then
                        if DateDiff("n", refeicao, now()) > 60 then
                            GetLancheStatus = "ACAO_LANCHE_TARDE"
                        else
                            GetLancheStatus = "AGUARDANDO_REFEICAO"
                        end if
                    else
                        GetLancheStatus = "ACAO_LANCHE_TARDE"
                    end if
                end if
            elseif intervaloLanche = "CEDO" then
                if agora <= timeserial(8, 0, 0) then
                    GetLancheStatus = "08:00 às 10:30"
                elseif agora <= timeserial(10, 30, 0) then
                    GetLancheStatus = "ACAO_LANCHE_CEDO"
                end if
            elseif intervaloLanche = "TARDE" then
                if agora <= timeserial(14, 0, 0) then
                    GetLancheStatus = "14:00 às 16:30"
                elseif agora <= timeserial(16, 30, 0) then
                    if not isnull(refeicao) then
                        if DateDiff("n", refeicao, now()) > 60 then
                            GetLancheStatus = "ACAO_LANCHE_TARDE"
                        else
                            GetLancheStatus = "AGUARDANDO_REFEICAO"
                        end if
                    else
                        GetLancheStatus = "ACAO_LANCHE_TARDE"
                    end if
                end if
            end if
        case "12x00"
            if agora <= timeserial(14, 0, 0) then
                GetLancheStatus = "14:00 às 17:00"
            elseif agora <= timeserial(16, 30, 0) then
                GetLancheStatus = "ACAO_LANCHE_TARDE-14:00 às 16:30"
            else
                GetLancheStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
        case "17x05"
            if agora >= timeserial(17, 0, 0) or agora <= timeserial(1, 0, 0) then
                GetLancheStatus = "01:00 às 03:30"
            elseif agora <= timeserial(3, 30, 0) then
                GetLancheStatus = "ACAO_LANCHE_MADRUGADA-01:00 às 03:30"
            else
                GetLancheStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
        case "18x06" 
            if agora >= timeserial(17, 0, 0) or agora <= timeserial(2, 0, 0) then
                GetLancheStatus = "02:00 às 04:30"
            elseif agora <= timeserial(4, 30, 0) then
                GetLancheStatus = "ACAO_LANCHE_MADRUGADA-02:00 às 04:30"
            else
                GetLancheStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
    end select
end function

function GetRefeicaoStatus(turno, lanche, refeicao, totalNoLocal, lancheManhaCount, metadeTurma, intervaloLanche, lancheEscolhaCount)
    if not isnull(refeicao) or refeicao <> "" then
        GetRefeicaoStatus = "TIMER_REFEICAO." & FormatISOData(refeicao)
        exit function
    end if

    dim agora
    agora = time()

    select case turno
        case "05x17", "06x18"
            if (not isnull(lanche) or lanche <> "") or (intervaloLanche = "CEDO") then
                if agora <= timeserial(12, 30, 0) then
                    GetRefeicaoStatus = "12:30 às 14:00"
                elseif agora <= timeserial(14, 0, 0) then
                    GetRefeicaoStatus = "ACAO_REFEICAO_TARDE-12:30 às 14:00"
                else
                    GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
                end if
            elseif lancheEscolhaCount < metadeTurma and (isnull(lanche) or lanche = "") then
                if agora <= timeserial(10, 30, 0) then
                    GetRefeicaoStatus = "10:30 às 14:00"
                elseif agora <= timeserial(14, 0, 0) then
                    GetRefeicaoStatus = "ACAO_REFEICAO-10:30 às 14:00"
                else
                    GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
                end if
            elseif (isnull(lanche) or lanche = "") or (intervaloLanche = "TARDE" or intervaloLanche = "") then
                if agora <= timeserial(10, 30, 0) then
                    GetRefeicaoStatus = "10:30 às 12:30"
                elseif agora <= timeserial(12, 30, 0) then
                    GetRefeicaoStatus = "ACAO_REFEICAO_CEDO-10:30 às 12:30"
                else
                    GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
                end if
            end if
        case "12x00"
            if agora <= timeserial(18, 30, 0) then
                GetRefeicaoStatus = "19:00 às 21:00"
            elseif agora <= timeserial(21, 0, 0) then
                GetRefeicaoStatus = "ACAO_REFEICAO_NOITE_12x00-19:00 às 21:00"
            else
                GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
        case "17x05"
            if agora <= timeserial(19, 30, 0) then
                GetRefeicaoStatus = "20:00 às 23:30"
            elseif agora <= timeserial(23, 30, 0) then
                GetRefeicaoStatus = "ACAO_REFEICAO_NOITE_17x05-20:00 às 23:30"
            else
                GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
        case "18x06"
            if agora >= TimeSerial(17, 0, 0) and agora <= timeserial(20, 30, 0) then
                GetRefeicaoStatus = "21:00 às 00:00"
            elseif agora >= TimeSerial(17, 0, 0) and agora <= timeserial(23, 59, 59) then
                GetRefeicaoStatus = "ACAO_REFEICAO_NOITE_18x06-21:00 às 00:00"
            else
                GetRefeicaoStatus = "Não Solicitado <i class='fa-solid fa-triangle-exclamation'></i>"
            end if
    end select
end function

function verificarStatusFimJornada(turno, dataHoraApresentacao, fimJornada)
    dim horarioFimTurno, status
    status = "false"

    if isnull(fimJornada) or fimJornada = "" then
        select case turno
            case "06x18"
                horarioFimTurno = Date() & " " & timeserial(18, 0, 0)
            case "18x06"
                horarioFimTurno = (DateValue(dataHoraApresentacao) + 1) & " " & timeserial(6, 0, 0)
            case "05x17"
                horarioFimTurno = Date() & " " & timeserial(17, 0, 0)
            case "17x05"
                horarioFimTurno = (DateValue(dataHoraApresentacao) + 1) & " " & timeserial(5, 0, 0)
            case "12x00"
                horarioFimTurno = ((DateValue(dataHoraApresentacao) + 1) & " " & timeserial(0, 0, 0))
            case "ADM"
                horarioFimTurno = Date() & " " & timeserial(16, 30, 0)
            case Else
                horarioFimTurno = DateAdd("n", 720, dataHoraApresentacao)
        end select

        diffFimJornada = DateDiff("n", horarioFimTurno, now())
        if diffFimJornada > 0 then
            status = "true"
        end if
    end if

    verificarStatusFimJornada = status
end function

function FormatISOData(dt)
    if isnull(dt) or not isdate(dt) then
        FormatISOData = ""
    else
        FormatISOData = year(dt) & "-" &_ 
        right("0" & month(dt), 2) & "-" & _
        right("0" & day(dt), 2) & "T" & _
        right("0" & hour(dt), 2) & ":" & _
        right("0" & minute(dt), 2) & ":" & _
        right("0" & second(dt), 2)
    end if
end function

function verifyDateTimeNullCorrect(value)
    if not isnull(value) then
        value = FormatDateTime(value, vbShortTime)
    else
        value = null
    end if

    verifyDateTimeNullCorrect = value
end function

function EscapeJSON(str)
    if isnull(str) then
        EscapeJSON = ""
    else
        str = replace(str, "\", "\\")
        str = replace(str, """", "\""")
        str = replace(str, vbcrlf, "\n")
        str = replace(str, vbcr, "\n")
        str = replace(str, vblf, "\n")
        str = replace(str, vbtab, "\t")

        EscapeJSON = str
    end if
end function

' Essa é uma função que fica nas telas do pátio (index.asp) e CCP (ccp.asp) para mostrar o horário do último registro em uma supervisão filtrada
function ultimaAtualizacao(torreFiltro)

    Dim conn, data_ultima_atualizacao, sql, strUltimaAtt
    Set conn = getConexao()

    If torreFiltro <> "" Then
        sql = "SELECT TOP 1 data_hora_apresentacao " & _
              "FROM registros_apresentacao " & _
              "WHERE supervisao_ra = '" & torreFiltro & "' AND (" & _
              "(DATEPART('h', data_hora_apresentacao) >= 5 AND DATEPART('h', data_hora_apresentacao) < 17) " & _
              "OR " & _
              "(DATEPART('h', data_hora_apresentacao) >= 17 OR DATEPART('h', data_hora_apresentacao) < 5)" & _
              ") " & _
              "ORDER BY data_hora_apresentacao DESC"
    Else
        sql = "SELECT TOP 1 data_hora_apresentacao " & _
              "FROM registros_apresentacao " & _
              "ORDER BY data_hora_apresentacao DESC"
    end If

    Set data_ultima_atualizacao = conn.Execute(sql)

    If Not data_ultima_atualizacao.EOF Then
        strUltimaAtt = FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbShortDate) & " " & FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbLongTime)
    Else
        strUltimaAtt = "--/--/-- --:--:--"
    end If

    ultimaAtualizacao = strUltimaAtt

end function

' Essa função é para reduzir o nome de cargos para deixar mais agradavel na tela
function reduzirNomeFuncao(cargo)

    select case cargo
        case "OFICIAL OPERACAO FERROVIARIA", "OFICIAL OP FERROV FORM PROFIS"
            cargo = "OOF"
        case "INSPETOR ORIENT OP FERROV ESP"
            cargo = "INSPETOR ESP"
        case "MAQUINISTA PATIO", "MAQUINISTA"
            cargo = "MAQ"
        case "TECNICO OPERACAO FERROVIARIA"
            cargo = "TOF"
        case "TRAINEE OPERACIONAL"
            cargo = "TRAINEE"
        case "INSPETOR ORIENT OP FERROV I"
            cargo = "INSPETOR I"
        case "INSPETOR ORIENT OP FERROV II"
            cargo = "INSPETOR II"
        case "OPERADOR LOCOMOTIVA REMOTO I"
            cargo = "MAQ REMOTO I"
        case "OPERADOR LOCOMOTIVA REMOTO II"
            cargo = "MAQ REMOTO II"
        case "TECNICO OPERACAO"
            cargo = "TO"
        case else
            cargo = cargo
    end select

    reduzirNomeFuncao = cargo

end function

function verificarTurno(turno)
    If (TimeValue(Now()) >= TimeSerial(4, 30, 0)) And (TimeValue(Now()) < TimeSerial(5, 40, 0)) and (turno <> "05x17") Then
        verificarTurno = "05x17"
    ElseIf (TimeValue(Now()) >= TimeSerial(5, 40, 0)) And (TimeValue(Now()) < TimeSerial(11, 40, 0)) and (turno <> "06x18") Then
        verificarTurno = "06x18"
    ElseIf (TimeValue(Now()) >= TimeSerial(11, 40, 0)) And (TimeValue(Now()) < TimeSerial(12, 45, 0)) and (turno <> "12x00") Then
        verificarTurno = "12x00"
    ElseIf (TimeValue(Now()) >= TimeSerial(12, 45, 0)) And (TimeValue(Now()) < TimeSerial(16, 40, 0)) and (turno <> "13x01") Then
        verificarTurno = "13x01"
    ElseIf (TimeValue(Now()) >= TimeSerial(16, 40, 0)) And (TimeValue(Now()) < TimeSerial(17, 40, 0)) and (turno <> "17x05") Then
        verificarTurno = "17x05"
    ElseIf (TimeValue(Now()) >= TimeSerial(17, 40, 0)) And (TimeValue(Now()) < TimeSerial(23, 40, 0)) and (turno <> "18x06") Then
        verificarTurno = "18x06"
    else
        verificarTurno = turno
    end If
end function

%>
