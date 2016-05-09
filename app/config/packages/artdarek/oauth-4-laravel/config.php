<?php 

return array( 
	
	/*
	|--------------------------------------------------------------------------
	| oAuth Config
	|--------------------------------------------------------------------------
	*/

	/**
	 * Storage
	 */
	'storage' => 'Session', 

	/**
	 * Consumers
	 */
	'consumers' => array(

		/**
		 * Facebook
		 */
        'Facebook' => array(
            'client_id'     => '1629397260607217',
            'client_secret' => '5da961c151e0e6fb08ea10458c4036fd',
			'scope'         => array('email','read_friendlists','user_online_presence'),
        ),		

	)

);