<!DOCTYPE html>
<html lang="en-US">
	<head>
		<meta charset="utf-8">
	</head>
	<body>
		<h2>Recuperación de contraseña</h2>

		<div>
			Para resetear tu contraseña, complete este formulario: {{ URL::to('password/reset', array($token)) }}.<br/>
			Este link expirará en {{ Config::get('auth.reminder.expire', 60) }} minutos.
		</div>
	</body>
</html>
